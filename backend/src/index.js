import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import db from '../models/index.cjs';
import { parse } from 'csv-parse';
import fs from 'fs';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });


app.use(cors());
app.use(express.json());

// Test route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Função para garantir que as tabelas existem antes de iniciar o servidor
async function ensureTables() {
  // Tabela de usuários
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    category TEXT
  )`);

  // Tabela para cruzamento descrição-categoria-usuário
  await pool.query(`CREATE TABLE IF NOT EXISTS expense_category_memory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      UNIQUE(user_id, description)
  )`);
}


// Upload CSV and save to DB
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, delimiter: ',' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (const row of results) {
          const desc = row.description || row.title;
          const amount = typeof row.amount === 'string' ? parseFloat(row.amount.replace(/[^\d.-]/g, '')) : row.amount;
          const date = row.date;
          // Checa duplicidade
          const { rows: exists } = await pool.query(
            'SELECT 1 FROM expenses WHERE description = $1 AND amount = $2 AND date = $3',
            [desc, amount, date]
          );
          if (exists.length === 0) {
            await pool.query(
              'INSERT INTO expenses (description, amount, date, category) VALUES ($1, $2, $3, $4)',
              [desc, amount, date, row.category || null]
            );
          }
        }
        fs.unlinkSync(req.file.path);
        res.json({ success: true, count: results.length });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
});

// List all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.Category.findAll({ order: [['name', 'ASC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new category
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  try {
    const [cat, created] = await db.Category.findOrCreate({ where: { name } });
    if (!created) return res.status(409).json({ error: 'Category already exists' });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.Category.destroy({ where: { id } });
    res.json({ success: !!deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all expenses (autenticado)
app.get('/api/expenses', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  try {
    const expenses = await db.Expense.findAll({ where: { userId: user_id }, order: [['date', 'DESC']] });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar várias despesas de uma vez (autenticado)
app.post('/api/expenses', authMiddleware, async (req, res) => {
  const expenses = req.body;
  const user_id = req.user.id;
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return res.status(400).json({ error: 'Array de despesas obrigatório' });
  }
  try {
    let count = 0;
    for (const exp of expenses) {
      const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount.replace(/[^\d.-]/g, '')) : exp.amount;
      const desc = exp.description || exp.title;
      const date = exp.date;
      // Checa duplicidade
      const exists = await db.Expense.findOne({ where: { userId: user_id, description: desc, amount, date } });
      if (!exists) {
        await db.Expense.create({ userId: user_id, description: desc, amount, date, category: exp.category || null });
        count++;
      }
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Função utilitária para normalizar descrição (remove final de parcela tipo 1/10, 2/10, etc)
function normalizeDescription(desc) {
  if (!desc) return '';
  return desc.replace(/\s*\d+\/\d+$/, '').trim();
}

// Salvar cruzamento descrição-categoria-usuário (autenticado)
app.post('/api/memory', authMiddleware, async (req, res) => {
  const { description, category } = req.body;
  const user_id = req.user.id;
  if (!user_id || !description || !category) return res.status(400).json({ error: 'user_id, description e category obrigatórios' });
  const normDesc = normalizeDescription(description);
  try {
    const [mem, created] = await db.ExpenseCategoryMemory.findOrCreate({
      where: { userId: user_id, description: normDesc },
      defaults: { category }
    });
    if (!created) {
      mem.category = category;
      await mem.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar categoria memorizada para uma descrição (autenticado)
app.get('/api/memory', authMiddleware, async (req, res) => {
  const { description } = req.query;
  const user_id = req.user.id;
  if (!user_id || !description) return res.status(400).json({ error: 'user_id e description obrigatórios' });
  const normDesc = normalizeDescription(description);
  try {
    const mem = await db.ExpenseCategoryMemory.findOne({ where: { userId: user_id, description: normDesc } });
    res.json({ category: mem ? mem.category : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// JWT helpers
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Cadastro
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
    const user = await db.User.create({ email, password_hash: hash });
    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  const user = await db.User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  const token = generateToken(user);
  res.json({ token });
});


const PORT = process.env.PORT || 4000;
ensureTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erro ao criar tabelas:', err);
  process.exit(1);
});
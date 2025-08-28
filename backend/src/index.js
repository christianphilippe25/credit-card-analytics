import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { parse } from 'csv-parse';
import fs from 'fs';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://carduser:cardpass@localhost:5432/carddb',
});

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
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new category
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  try {
    const { rows } = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Category already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all expenses (autenticado)
app.get('/api/expenses', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  try {
    const { rows } = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC', [user_id]);
    res.json(rows);
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
    for (const exp of expenses) {
      const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount.replace(/[^\d.-]/g, '')) : exp.amount;
      const desc = exp.description || exp.title;
      const date = exp.date;
      // Checa duplicidade
      const { rows: exists } = await pool.query(
        'SELECT 1 FROM expenses WHERE user_id = $1 AND description = $2 AND amount = $3 AND date = $4',
        [user_id, desc, amount, date]
      );
      if (exists.length === 0) {
        await pool.query(
          'INSERT INTO expenses (user_id, description, amount, date, category) VALUES ($1, $2, $3, $4, $5)',
          [user_id, desc, amount, date, exp.category || null]
        );
      }
    }
    res.json({ success: true, count: expenses.length });
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
    await pool.query(
      `INSERT INTO expense_category_memory (user_id, description, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, description) DO UPDATE SET category = EXCLUDED.category`,
      [user_id, normDesc, category]
    );
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
    const { rows } = await pool.query(
      'SELECT category FROM expense_category_memory WHERE user_id = $1 AND description = $2',
      [user_id, normDesc]
    );
    if (rows.length) {
      res.json({ category: rows[0].category });
    } else {
      res.json({ category: null });
    }
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
    const { rows } = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email, hash]);
    const token = generateToken(rows[0]);
    res.json({ token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  const user = rows[0];
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
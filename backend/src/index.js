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
  await pool.query(`CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    category TEXT
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
          await pool.query(
            'INSERT INTO expenses (description, amount, date, category) VALUES ($1, $2, $3, $4)',
            [row.description, row.amount, row.date, row.category || null]
          );
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

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

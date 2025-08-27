CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT
);

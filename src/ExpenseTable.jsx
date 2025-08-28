import React from 'react';

export default function ExpenseTable({ expenses, onCategorize, categories = [], hideValues }) {
  if (!expenses.length) return <p>No expenses loaded.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((exp, idx) => (
          <tr key={idx}>
            <td>{new Date(exp.date).toLocaleDateString('pt-BR')}</td>
            <td>{exp.description || exp.title}</td>
            <td>{hideValues ? '••••••' : exp.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>
              <select
                value={exp.category || ''}
                onChange={e => onCategorize(idx, e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

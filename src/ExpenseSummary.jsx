import React from 'react';

export default function ExpenseSummary({ expenses, hideValues }) {
  if (!expenses.length) return null;
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {});

  return (
    <div style={{
      maxWidth: 400,
      margin: '2em auto',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      padding: '1.5em 2em',
      textAlign: 'left',
    }}>
      <h3 style={{marginTop: 0, marginBottom: 16, color: '#333'}}>Summary</h3>
      <div className='summary' style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>
        Total: <span style={{color: '#4caf50'}}>{hideValues ? '••••••' : total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign: 'left', color: '#888', fontWeight: 500, fontSize: 14, paddingBottom: 4}}>Category</th>
            <th style={{textAlign: 'right', color: '#888', fontWeight: 500, fontSize: 14, paddingBottom: 4}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byCategory).map(([cat, amt]) => (
            <tr key={cat}>
              <td style={{padding: '4px 0'}}>{cat}</td>
              <td style={{textAlign: 'right', padding: '4px 0'}}>{hideValues ? '••••••' : amt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

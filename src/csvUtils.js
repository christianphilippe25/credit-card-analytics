// Simple CSV parser for credit card extracts
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const [header, ...rows] = lines;
  const keys = header.split(',');
  return rows.map(row => {
    const values = row.split(',');
    const obj = {};
    keys.forEach((k, i) => {
      obj[k.trim().toLowerCase()] = values[i]?.trim();
    });
    // Normalize fields for table
    return {
      date: obj.date || obj.data || '',
      title: obj.title || obj.descricao || '',
      amount: parseFloat(obj.amount || obj.valor || '0'),
      category: ''
    };
  })
  .filter(e => !isNaN(e.amount) && e.amount >= 0);
}

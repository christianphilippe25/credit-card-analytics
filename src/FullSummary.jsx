import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function FullSummary({ months }) {
  if (!months.length) return null;

  // Get all categories
  const allCategories = Array.from(new Set(months.flatMap(m => m.expenses.map(e => e.category || 'Uncategorized'))));
  // Get all months (x axis)
  const monthLabels = months.map(m => m.name);

  // Build dataset for each category
  const datasets = allCategories.map((cat, i) => {
    return {
      label: cat,
      data: months.map(m => m.expenses.filter(e => (e.category || 'Uncategorized') === cat).reduce((sum, e) => sum + (e.amount || 0), 0)),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '33',
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  const data = {
    labels: monthLabels,
    datasets,
  };

  return (
    <div style={{maxWidth: 900, margin: '2em auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2em'}}>
      <h2 style={{marginTop: 0, color: '#333'}}>Resumo Comparativo dos Meses</h2>
      <div style={{maxHeight: 380, minHeight: 260, height: 350, overflow: 'auto'}}>
        <Line data={data} options={{
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } },
          responsive: true,
          maintainAspectRatio: false,
        }} height={350} />
      </div>
    </div>
  );
}

const colors = [
  '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#ffc107', '#607d8b', '#00bcd4', '#8bc34a', '#f44336', '#795548', '#3f51b5', '#009688', '#cddc39', '#ff5722', '#673ab7', '#bdbdbd', '#ffeb3b', '#1de9b6', '#d500f9'
];

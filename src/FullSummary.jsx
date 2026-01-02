import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function FullSummary({ months, darkMode }) {
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

  // Total expenses chart for last 12 months
  const last12Months = months.slice(-12);
  const totalLabels = last12Months.map(m => m.name);
  const totalData = last12Months.map(m => m.expenses.reduce((sum, e) => sum + (e.amount || 0), 0));
  const barData = {
    labels: totalLabels,
    datasets: [{
      label: 'Total Gastos',
      data: totalData,
      backgroundColor: '#2196f3',
    }],
  };

  const textColor = darkMode ? '#ffffff' : '#333';
  const bgColor = darkMode ? '#1e1e1e' : '#fff';
  const shadow = darkMode ? '0 2px 8px rgba(255,255,255,0.07)' : '0 2px 8px rgba(0,0,0,0.07)';

  const lineOptions = {
    plugins: { legend: { position: 'top', labels: { color: textColor } } },
    scales: {
      x: { ticks: { color: textColor } },
      y: { beginAtZero: true, ticks: { color: textColor } }
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const barOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textColor } },
      y: { beginAtZero: true, ticks: { color: textColor } }
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{maxWidth: 1200, margin: '2em auto', background: bgColor, borderRadius: 12, boxShadow: shadow, padding: '2em', display: 'flex', flexDirection: 'column', gap: '2em', color: textColor}}>
      <div style={{flex: 1}}>
        <h2 style={{marginTop: 0, color: textColor}}>Resumo Comparativo dos Meses</h2>
        <div style={{maxHeight: 380, minHeight: 260, height: 350, overflow: 'auto'}}>
          <Line data={data} options={lineOptions} height={350} />
        </div>
      </div>
      <div style={{flex: 1}}>
        <h2 style={{marginTop: 0, color: textColor}}>Total de Gastos por Mês</h2>
        <div style={{maxHeight: 380, minHeight: 260, height: 350, overflow: 'auto'}}>
          <Bar data={barData} options={barOptions} height={350} />
        </div>
      </div>
    </div>
  );
}

const colors = [
  '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#ffc107', '#607d8b', '#00bcd4', '#8bc34a', '#f44336', '#795548', '#3f51b5', '#009688', '#cddc39', '#ff5722', '#673ab7', '#bdbdbd', '#ffeb3b', '#1de9b6', '#d500f9'
];

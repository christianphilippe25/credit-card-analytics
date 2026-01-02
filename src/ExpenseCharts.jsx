import React from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function ExpenseCharts({ expenses, hideValues, darkMode }) {
  if (!expenses.length) return null;


  // Pie and bar chart: by category
  const byCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const pieData = {
    labels: Object.keys(byCategory),
    datasets: [
      {
        data: Object.values(byCategory),
        backgroundColor: [
          '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#ffc107', '#607d8b', '#00bcd4', '#8bc34a', '#f44336', '#795548', '#3f51b5', '#009688', '#cddc39', '#ff5722', '#673ab7', '#bdbdbd', '#ffeb3b', '#1de9b6', '#d500f9'
        ],
      },
    ],
  };
  const barCategoryData = {
    labels: Object.keys(byCategory),
    datasets: [
      {
        label: 'Total by Category',
        data: Object.values(byCategory),
        backgroundColor: '#4caf50',
      },
    ],
  };

  // Bar chart: by month
  const byMonth = {};
  expenses.forEach(e => {
    const m = (e.date || '').slice(0, 7); // YYYY-MM
    if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + (e.amount || 0);
  });

  const textColor = darkMode ? '#ffffff' : '#000000';
  const bgColor = darkMode ? '#1e1e1e' : '#ffffff';

  const pieOptions = hideValues ? {
    plugins: {
      legend: { display: false, labels: { color: textColor } },
      tooltip: { enabled: false }
    }
  } : {
    plugins: {
      legend: { labels: { color: textColor } }
    }
  };

  const barOptions = hideValues ? {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { ticks: { color: textColor } },
      y: { beginAtZero: true, display: false, ticks: { color: textColor } }
    },
    elements: { bar: { backgroundColor: '#bbb' } }
  } : {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textColor } },
      y: { beginAtZero: true, ticks: { color: textColor } }
    }
  };

  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', margin: '2em 0'}}>
      <div style={{width: 320, background: bgColor, padding: '1em', borderRadius: '8px'}}>
        <h4 style={{color: textColor}}>Expenses by Category (Pie)</h4>
        <Pie data={pieData} options={pieOptions} />
      </div>
      <div style={{width: 400, background: bgColor, padding: '1em', borderRadius: '8px'}}>
        <h4 style={{color: textColor}}>Expenses by Category (Bar)</h4>
        <Bar data={barCategoryData} options={barOptions} />
      </div>
    </div>
  );
}

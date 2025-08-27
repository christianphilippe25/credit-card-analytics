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

export default function ExpenseCharts({ expenses, hideValues }) {
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
  const barData = {
    labels: Object.keys(byMonth),
    datasets: [
      {
        label: 'Total by Month',
        data: Object.values(byMonth),
        backgroundColor: '#2196f3',
      },
    ],
  };

  const chartOptions = hideValues ? {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: { y: { beginAtZero: true, display: false } },
    elements: { bar: { backgroundColor: '#bbb' } }
  } : {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', margin: '2em 0'}}>
      <div style={{width: 320}}>
        <h4>Expenses by Category (Pie)</h4>
        <Pie data={pieData} options={hideValues ? { plugins: { legend: { display: false }, tooltip: { enabled: false } } } : {}} />
      </div>
      <div style={{width: 400}}>
        <h4>Expenses by Category (Bar)</h4>
        <Bar data={barCategoryData} options={chartOptions} />
      </div>
      <div style={{width: 400}}>
        <h4>Expenses by Month</h4>
        <Bar data={barData} options={chartOptions} />
      </div>
    </div>
  );
}

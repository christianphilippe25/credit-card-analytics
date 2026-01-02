import FullSummary from './FullSummary';

import { useState, useEffect } from 'react';
import CSVUpload from './CSVUpload';
import ExpenseTable from './ExpenseTable';
import ExpenseSummary from './ExpenseSummary';
import ExpenseCharts from './ExpenseCharts';
import { parseCSV } from './csvUtils';
import './App.css';

const CATEGORY_KEY = 'expense-categories-memory';


function App() {
  const [months, setMonths] = useState([]); // [{name, expenses}]
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [categoryMemory, setCategoryMemory] = useState({});
  const [categories, setCategories] = useState([
    'Alimentação', 'Transporte', 'Compras', 'Contas', 'Outro', 'assinatura', 'pet', 'carro', 'casa', 'Saúde'
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [hideValues, setHideValues] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    const mem = localStorage.getItem(CATEGORY_KEY);
    if (mem) setCategoryMemory(JSON.parse(mem));
    const cat = localStorage.getItem('expense-categories-list');
    if (cat) setCategories(JSON.parse(cat));
    // Auto-load saved expenses
    const saved = localStorage.getItem(EXPENSES_KEY);
    if (saved) {
      const loaded = JSON.parse(saved);
      if (Array.isArray(loaded)) {
        setMonths(loaded);
        setSelectedMonth(loaded.length ? loaded[0].name : null);
      } else if (loaded.months) {
        setMonths(loaded.months || []);
        setCategories(loaded.categories || [
          'Alimentação', 'Transporte', 'Compras', 'Contas', 'Outro', 'assinatura', 'pet', 'carro', 'casa', 'Saúde'
        ]);
        setSelectedMonth((loaded.months && loaded.months.length) ? loaded.months[0].name : null);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(categoryMemory));
  }, [categoryMemory]);

  useEffect(() => {
    localStorage.setItem('expense-categories-list', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);


  // Save/load expenses to localStorage
  const EXPENSES_KEY = 'expense-saved-list';

  const handleCSV = (text, fileName) => {
    let parsed = parseCSV(text);
    // Auto-categorize from memory
    parsed = parsed.map(exp => ({
      ...exp,
      category: categoryMemory[exp.title] || ''
    }));
    // Try to infer month from data or filename
    let month = '';
    if (parsed.length && parsed[0].date) {
      month = parsed[0].date.slice(0, 7); // YYYY-MM
    } else if (fileName) {
      const m = fileName.match(/\d{4}-\d{2}/);
      if (m) month = m[0];
      else month = fileName;
    }
    if (!month) month = `Month ${months.length + 1}`;
    setMonths(prev => {
      const updated = [...prev, { name: month, expenses: parsed }];
      setSelectedMonth(month);
      return updated;
    });
  };


  const handleSaveExpenses = () => {
    const saveObj = {
      months,
      categories
    };
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(saveObj));
    alert('Expenses and categories saved!');
  };


  const handleLoadExpenses = () => {
    const saved = localStorage.getItem(EXPENSES_KEY);
    if (saved) {
      const loaded = JSON.parse(saved);
      if (Array.isArray(loaded)) {
        setMonths(loaded);
        setSelectedMonth(loaded.length ? loaded[0].name : null);
      } else {
        setMonths(loaded.months || []);
        setCategories(loaded.categories || [
          'Alimentação', 'Transporte', 'Compras', 'Contas', 'Outro', 'assinatura', 'pet', 'carro', 'casa', 'Saúde'
        ]);
        setSelectedMonth((loaded.months && loaded.months.length) ? loaded.months[0].name : null);
      }
    } else {
      alert('No saved expenses found.');
    }
  };

  const handleCategorize = (idx, category) => {
    setMonths(months => {
      return months.map(m => {
        if (m.name !== selectedMonth) return m;
        const updated = [...m.expenses];
        updated[idx] = { ...updated[idx], category };
        setCategoryMemory(mem => ({ ...mem, [updated[idx].title]: category }));
        return { ...m, expenses: updated };
      });
    });
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const cat = newCategory.trim();
    if (cat && !categories.includes(cat)) {
      setCategories([...categories, cat]);
      setNewCategory('');
    }
  };

  // Exporta todos os dados (meses, categorias, memória de categorias) para um arquivo JSON
  const handleExportAll = () => {
    const data = {
      months,
      categories,
      categoryMemory
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analise_cartao_dados.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importa todos os dados de um arquivo JSON
  const handleImportAll = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.months && data.categories && data.categoryMemory) {
          setMonths(data.months);
          setCategories(data.categories);
          setCategoryMemory(data.categoryMemory);
          setSelectedMonth(data.months.length ? data.months[0].name : null);
          alert('Dados importados com sucesso!');
        } else {
          alert('Arquivo inválido.');
        }
      } catch {
        alert('Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir importar o mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  if (!months.length) {
    return (
      <div className="container">
        <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5em',
              borderRadius: '50%',
              border: 'none',
              background: darkMode ? '#333' : '#fff',
              color: darkMode ? '#fff' : '#000',
              cursor: 'pointer',
              fontSize: '1.2em',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <h1>Credit Card Expense Analyzer</h1>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          margin: '2em 0',
          maxWidth: 400,
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center'
        }}>
          <p>Bem-vindo! Carregue seus dados de gastos para começar a análise.</p>
          <div style={{width: '100%'}}>
            <CSVUpload onData={(text, file) => handleCSV(text, file?.name)} />
          </div>
          <button onClick={handleLoadExpenses} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 600}}>Carregar Dados Salvos</button>
          <label style={{width: '100%'}}>
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportAll} id="import-all-input" />
            <span style={{width: '100%', display: 'inline-block'}}>
              <button type="button" onClick={() => document.getElementById('import-all-input').click()} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#009688', color: '#fff', fontWeight: 600}}>Importar Arquivo JSON</button>
            </span>
          </label>
        </div>
        <footer style={{marginTop: 32, fontSize: 12, color: '#888'}}>Your categories and results are saved locally in your browser.</footer>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            padding: '0.5em',
            borderRadius: '50%',
            border: 'none',
            background: darkMode ? '#333' : '#fff',
            color: darkMode ? '#fff' : '#000',
            cursor: 'pointer',
            fontSize: '1.2em',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <h1>Credit Card Expense Analyzer</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '1em 0' }}>
        <button
          onClick={() => setActiveTab('geral')}
          style={{
            padding: '0.5em 1em',
            border: 'none',
            background: activeTab === 'geral' ? '#646cff' : '#f0f0f0',
            color: activeTab === 'geral' ? '#fff' : '#000',
            cursor: 'pointer',
            borderRadius: '4px 0 0 4px',
            fontWeight: 600
          }}
        >
          Dados Gerais
        </button>
        <button
          onClick={() => setActiveTab('mensal')}
          style={{
            padding: '0.5em 1em',
            border: 'none',
            background: activeTab === 'mensal' ? '#646cff' : '#f0f0f0',
            color: activeTab === 'mensal' ? '#fff' : '#000',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Análise Mensal
        </button>
        <button
          onClick={() => setActiveTab('categorias')}
          style={{
            padding: '0.5em 1em',
            border: 'none',
            background: activeTab === 'categorias' ? '#646cff' : '#f0f0f0',
            color: activeTab === 'categorias' ? '#fff' : '#000',
            cursor: 'pointer',
            borderRadius: '0 4px 4px 0',
            fontWeight: 600
          }}
        >
          Gerenciar Dados
        </button>
      </div>

      {activeTab === 'geral' && months.length > 0 && (() => {
        const sortedMonths = [...months].sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
        return <FullSummary months={sortedMonths} darkMode={darkMode} />;
      })()}

      {activeTab === 'mensal' && months.length > 0 && (() => {
        const sortedMonths = [...months].sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
        const all = months.find(m => m.name === selectedMonth)?.expenses || [];
        const filtered = categoryFilter ? all.filter(e => e.category === categoryFilter) : all;
        return <>
          <div style={{margin: '1em 0'}}>
            <label htmlFor="month-select"><b>Select Month:</b> </label>
            <select id="month-select" value={selectedMonth || ''} onChange={e => setSelectedMonth(e.target.value)}>
              {sortedMonths.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <ExpenseSummary expenses={filtered} hideValues={hideValues} darkMode={darkMode} />
          <ExpenseCharts expenses={filtered} hideValues={hideValues} darkMode={darkMode} />
          <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '1em 0', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto'}}>
            <label htmlFor="category-filter" style={{marginRight: 8}}><b>Filtrar por categoria:</b></label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{padding: '0.25em 0.5em', borderRadius: 4, border: '1px solid #ccc', minWidth: 120}}
            >
              <option value="">Todas</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <ExpenseTable expenses={filtered} onCategorize={handleCategorize} categories={categories} hideValues={hideValues} />
        </>;
      })()}

      {activeTab === 'categorias' && (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            margin: '1em 0',
            maxWidth: 340,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <div style={{width: '100%'}}>
              <CSVUpload onData={(text, file) => handleCSV(text, file?.name)} />
            </div>
          </div>
          <form onSubmit={handleAddCategory} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            margin: '1em 0 2em 0',
            maxWidth: 340,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Add new category"
              style={{padding: '0.5em', borderRadius: 6, border: '1px solid #ccc', width: '100%'}}
            />
            <button type="submit" style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#646cff', color: '#fff', fontWeight: 600}}>Add Category</button>
          </form>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            margin: '1em 0',
            maxWidth: 340,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <button onClick={handleSaveExpenses} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#4caf50', color: '#fff', fontWeight: 600}}>Save Results</button>
            <button onClick={handleLoadExpenses} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 600}}>Load Saved</button>
            <button onClick={handleExportAll} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#673ab7', color: '#fff', fontWeight: 600}}>Exportar Dados</button>
            <label style={{width: '100%'}}>
              <input type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportAll} id="import-all-input" />
              <span style={{width: '100%', display: 'inline-block'}}>
                <button type="button" onClick={() => document.getElementById('import-all-input').click()} style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: '#009688', color: '#fff', fontWeight: 600}}>Importar Dados</button>
              </span>
            </label>
            <button
              onClick={() => setHideValues(v => !v)}
              style={{width: '100%', padding: '0.5em 1.2em', borderRadius: 6, border: 'none', background: hideValues ? '#888' : '#ff9800', color: '#fff', fontWeight: 600}}
            >
              {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            </button>
          </div>
        </>
      )}
      <footer style={{marginTop: 32, fontSize: 12, color: '#888'}}>Your categories and results are saved locally in your browser.</footer>
    </div>
  );
}

export default App;

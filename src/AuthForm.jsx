import React, { useState } from 'react';

export default function AuthForm({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      onAuth(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth: 340, margin: '4em auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: '2em'}}>
      <h2 style={{textAlign: 'center', marginBottom: 24}}>{mode === 'login' ? 'Login' : 'Cadastro'}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc'}} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" required style={{width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #ccc'}} />
        <button type="submit" disabled={loading} style={{width: '100%', padding: '0.7em', borderRadius: 6, border: 'none', background: '#646cff', color: '#fff', fontWeight: 600, marginBottom: 8}}>{loading ? 'Enviando...' : (mode === 'login' ? 'Entrar' : 'Cadastrar')}</button>
      </form>
      <div style={{textAlign: 'center', marginTop: 8}}>
        {mode === 'login' ? (
          <span>Não tem conta? <button onClick={() => setMode('register')} style={{background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer'}}>Cadastre-se</button></span>
        ) : (
          <span>Já tem conta? <button onClick={() => setMode('login')} style={{background: 'none', border: 'none', color: '#2196f3', cursor: 'pointer'}}>Entrar</button></span>
        )}
      </div>
      {error && <div style={{color: 'red', marginTop: 12, textAlign: 'center'}}>{error}</div>}
    </div>
  );
}

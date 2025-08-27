
import React, { useState } from 'react';

export default function CSVUpload({ onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erro ao enviar arquivo');
      const data = await res.json();
      onUpload && onUpload();
    } catch (err) {
      setError('Falha no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor="csv-upload">Upload CSV Extract:</label>
      <input id="csv-upload" type="file" accept=".csv" onChange={handleFile} disabled={uploading} />
      {uploading && <span style={{marginLeft:8}}>Enviando...</span>}
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
}

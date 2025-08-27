import React from 'react';


export default function CSVUpload({ onData }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      onData(text, file);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <label htmlFor="csv-upload">Upload CSV Extract:</label>
      <input id="csv-upload" type="file" accept=".csv" onChange={handleFile} />
    </div>
  );
}

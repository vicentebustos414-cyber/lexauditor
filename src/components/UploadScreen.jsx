import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

const UploadScreen = ({ onUpload }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contractType, setContractType] = useState('Honorarios');
  const [isDragging, setIsDragging] = useState(false);

  const types = [
    { id: 'Honorarios', label: 'Prestación de Servicios (Honorarios)' },
    { id: 'Arriendo', label: 'Contrato de Arriendo' },
    { id: 'NDA', label: 'Acuerdo de Confidencialidad (NDA)' }
  ];

  const handleDivClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processUpload = () => {
    if (!selectedFile) {
      alert("Por favor selecciona un archivo primero");
      return;
    }
    onUpload(selectedFile, contractType);
  };

  return (
    <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
          Auditoría de Contratos Inteligente
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Sube un documento legal para que nuestra IA lo audite bajo la normativa chilena.</p>
      </div>

      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Selector de Tipo */}
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', padding: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-teal)', fontSize: '1.1rem' }}>1. Selecciona el Tipo de Contrato</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {types.map(t => (
              <div 
                key={t.id}
                onClick={() => setContractType(t.id)}
                style={{ 
                  padding: '15px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  border: '1px solid ' + (contractType === t.id ? 'var(--accent-teal)' : 'var(--border-color)'),
                  background: contractType === t.id ? 'rgba(14, 165, 233, 0.1)' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ color: contractType === t.id ? 'white' : 'var(--text-secondary)', fontWeight: contractType === t.id ? 600 : 400 }}>{t.label}</span>
                {contractType === t.id && <CheckCircle2 size={18} color="var(--accent-teal)" />}
              </div>
            ))}
          </div>
        </div>

        {/* Zona de Carga */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-teal)', fontSize: '1.1rem' }}>2. Carga el Documento</h3>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept=".pdf,.doc,.docx" 
          />

          <div 
            className={`glass-panel ${isDragging ? 'glow-active' : ''}`}
            style={{ 
              width: '100%', 
              padding: '40px 20px', 
              textAlign: 'center', 
              border: '2px dashed ' + (isDragging ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)'), 
              cursor: 'pointer', 
              transition: 'all 0.3s ease',
              height: '240px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={handleDivClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="animate-fade-in">
                <FileText size={48} color="var(--accent-gold)" style={{ marginBottom: '15px' }} />
                <h4 style={{ color: 'white', marginBottom: '5px', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{selectedFile.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <span style={{ color: 'var(--accent-teal)', fontSize: '0.85rem', marginTop: '10px', display: 'block' }}>Haga clic para cambiar archivo</span>
              </div>
            ) : (
              <>
                <UploadCloud size={48} color="var(--accent-teal)" style={{ marginBottom: '15px' }} />
                <p style={{ color: 'white', marginBottom: '5px', fontWeight: 500 }}>Arrastra o selecciona el archivo</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Formatos: PDF, DOCX</p>
              </>
            )}
          </div>

          <button 
            className="btn-primary" 
            onClick={processUpload} 
            style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            disabled={!selectedFile}
          >
            Iniciar Auditoría IA <ChevronRight size={18} />
          </button>

          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.8rem', color: 'var(--success-green)', lineHeight: '1.4' }}>
            <span>🔒</span>
            <span><strong>Privacidad Garantizada:</strong> Los documentos se analizan en memoria de forma temporal y se destruyen de inmediato. No guardamos tus archivos en el servidor.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;


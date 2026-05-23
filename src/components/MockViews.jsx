import React, { useState } from 'react';
import { 
  FolderOpen, Scale, Settings, Search, Trash2, ExternalLink, 
  Plus, FileText, CheckCircle2, BookOpen, RefreshCw, Terminal, 
  AlertCircle, ShieldAlert, Zap, Copy, ChevronRight
} from 'lucide-react';

const MockViews = ({ currentView, savedContracts, onDeleteContract, onAddContract, onOpenContract, onUploadContract }) => {
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newSectionName, setNewSectionName] = useState('Laboral');
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRol, setCopiedRol] = useState(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("Hoy a las 03:00 AM");

  const [dragOver, setDragOver] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDocName || !newSectionName) return;
    
    // Si no hay archivo real seleccionado, agregamos uno de simulación
    let contractType = 'Honorarios';
    if (newSectionName === 'Comercial') contractType = 'Arriendo';
    else if (newSectionName === 'Confidencialidad') contractType = 'NDA';

    if (selectedFile) {
      if (onUploadContract) {
        onUploadContract(selectedFile, contractType);
      }
    } else {
      // Mock fallback
      onAddContract({ 
        name: newDocName.includes('.') ? newDocName : `${newDocName}.pdf`, 
        date: new Date().toLocaleDateString('es-CL'), 
        section: newSectionName, 
        contractType: contractType,
        status: 'Alerta' 
      });
      setNewDocName(''); 
      setShowAddForm(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-rellenar nombre si está vacío
      if (!newDocName) {
        setNewDocName(file.name);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true); 
    setSearchResults(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/jurisprudencia/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      if (!response.ok) {
        throw new Error('Error al conectar con el motor de jurisprudencia');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Error buscando jurisprudencia:', err);
      // Fallback a simulación local estructurada
      simulateLocalSearch();
    } finally {
      setIsSearching(false);
    }
  };

  const simulateLocalSearch = () => {
    const query = searchQuery.toLowerCase();
    let mockResults = [];
    
    if (query.includes('honorario') || query.includes('laboral') || query.includes('subordinacion')) {
      mockResults = [
        {
          rol: "Rol N° 23.456-2022",
          tribunal: "Corte Suprema",
          fecha: "2023",
          materia: "Laboral",
          extracto: "...la subordinación se presume ante la existencia de órdenes directas...",
          sintesis: "Sentencia hito que ratifica el principio de primacía de la realidad. Si un prestador de servicios a honorarios realiza funciones habituales bajo subordinación y dependencia (horario fijo, oficina provista, reporte directo), se le reconocen los derechos del Código del Trabajo.",
          url: "https://www.google.com/search?q=site:pjud.cl+%22Rol+23456-2022%22"
        }
      ];
    } else {
      mockResults = [
        {
          rol: "Rol N° 45.109-2022",
          tribunal: "Corte Suprema",
          fecha: "2022",
          materia: "Civil",
          extracto: "...las partes deben ejecutar los contratos de buena fe...",
          sintesis: `Fallo relevante que interpreta las obligaciones nacidas del acto jurídico en relación a la consulta: "${searchQuery}".`,
          url: `https://www.google.com/search?q=site:pjud.cl+%22Rol+45109-2022%22`
        }
      ];
    }
    setSearchResults(mockResults);
  };

  const copyToClipboard = (rol) => {
    navigator.clipboard.writeText(rol);
    setCopiedRol(rol);
    setTimeout(() => {
      setCopiedRol(null);
    }, 2000);
  };

  const runManualSync = () => {
    setIsSyncing(true); setSyncLogs([]);
    const logs = ["Iniciando pipeline de sincronización...", "Consultando fallos del PJUD...", "Clasificando por materias...", "Indexando base vectorial en base de datos...", "Sincronización automatizada exitosa."];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) { setSyncLogs(prev => [...prev, logs[i]]); i++; } 
      else { clearInterval(interval); setIsSyncing(false); setLastUpdate("Recién actualizado"); }
    }, 1000);
  };

  const sections = [...new Set(savedContracts.map(c => c.section))];

  return (
    <div className="animate-fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
      <div className="glass-panel" style={{ padding: '50px', maxWidth: '1000px', margin: '0 auto', minHeight: '85vh' }}>
        
        {/* Vista: Mis Contratos */}
        {currentView === 'mis_contratos' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '12px', borderRadius: '12px' }}><FolderOpen size={32} color="var(--accent-teal)" /></div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Repositorio Legal</h1>
              </div>
              <button onClick={() => { setShowAddForm(!showAddForm); setSelectedFile(null); }} className="btn-primary" style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Plus size={18} /> {showAddForm ? 'CERRAR PANEL' : 'NUEVO ARCHIVO'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAdd} className="glass-panel glow-active animate-fade-in" style={{ padding: '30px', marginBottom: '40px', border: '1px dashed var(--accent-teal)', background: 'rgba(14, 165, 233, 0.02)', borderRadius: '16px' }}>
                <h4 style={{ marginBottom: '20px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 600 }}><Zap size={18} /> Cargar y Auditar Contrato</h4>
                
                {/* Zona de Drag & Drop */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: dragOver ? '2px dashed var(--accent-teal)' : '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '30px',
                    textAlign: 'center',
                    background: dragOver ? 'rgba(14, 165, 233, 0.05)' : 'rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginBottom: '20px'
                  }}
                  onClick={() => document.getElementById('contract-file-input').click()}
                >
                  <input 
                    type="file" 
                    id="contract-file-input" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  <FileText size={48} color={selectedFile ? 'var(--success-green)' : 'var(--text-secondary)'} style={{ margin: '0 auto 15px', opacity: 0.7 }} />
                  {selectedFile ? (
                    <div>
                      <strong style={{ color: 'var(--success-green)', display: 'block', marginBottom: '5px' }}>Archivo Seleccionado:</strong>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Arrastra tu contrato PDF aquí</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>o haz clic para explorar en tu equipo</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Área / Categoría Legal</label>
                    <select 
                      value={newSectionName} 
                      onChange={(e) => setNewSectionName(e.target.value)} 
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="Laboral">Prestación de Servicios (Honorarios)</option>
                      <option value="Comercial">Contrato de Arriendo</option>
                      <option value="Confidencialidad">Acuerdo de Confidencialidad (NDA)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nombre de Documento</label>
                    <input 
                      value={newDocName} 
                      onChange={(e) => setNewDocName(e.target.value)} 
                      type="text" 
                      placeholder="Nombre del documento..." 
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', outline: 'none' }} 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={!selectedFile && !newDocName}
                  style={{ marginTop: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}
                >
                  <CheckCircle2 size={18} /> {selectedFile ? 'INICIAR AUDITORÍA IA CON PDF' : 'CREAR CONTRATO SIMULADO'}
                </button>
              </form>
            )}

            {savedContracts.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}>
                <FolderOpen size={48} color="var(--text-secondary)" style={{ marginBottom: '20px', opacity: 0.3 }} />
                <h4 style={{ color: 'white', marginBottom: '10px', fontSize: '1.2rem' }}>Tu Repositorio está Vacío</h4>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                   No tienes contratos en tu cuenta. Haz clic en "NUEVO ARCHIVO" arriba para cargar un PDF e iniciar el análisis de riesgos.
                 </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 15px', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.8rem', color: 'var(--success-green)' }}>
                  <span>🔒</span>
                  <span><strong>Privacidad 100%:</strong> Tus archivos se leen localmente y se analizan en memoria sin persistir en bases de datos externas.</span>
                </div>
              </div>
            ) : (
              sections.map((section, idx) => (
                <div key={idx} style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--accent-gold)', fontSize: '1.2rem', fontWeight: 600 }}>{section}</h3>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.3), transparent)' }}></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {savedContracts.filter(c => c.section === section).map((doc) => (
                      <div key={doc.id} className="premium-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 12px', background: doc.status === 'Seguro' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: doc.status === 'Seguro' ? 'var(--success-green)' : 'var(--alert-red)', fontSize: '0.7rem', fontWeight: 800, borderRadius: '0 0 0 12px', textTransform: 'uppercase' }}>{doc.status}</div>
                        <FileText size={40} color="var(--text-secondary)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <h4 style={{ color: 'white', marginBottom: '5px', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '40px' }}>{doc.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Modificado: {doc.date}</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => onOpenContract(doc)} style={{ flex: 1, background: 'rgba(14, 165, 233, 0.1)', border: '1px solid var(--accent-teal)', color: 'var(--accent-teal)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 600 }}><ExternalLink size={14} /> Abrir</button>
                          <button onClick={() => onDeleteContract(doc.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--alert-red)', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Vista: Base Jurisprudencial */}
        {currentView === 'base_jurisprudencial' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '12px' }}><Scale size={32} color="var(--accent-gold)" /></div>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Base Jurisprudencial Inteligente</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Búsqueda semántica de sentencias en todo ámbito del derecho chileno.</p>
                </div>
              </div>
              <a 
                href="https://www.pjud.cl/portal-unificado-sentencias" 
                target="_blank" 
                rel="noreferrer" 
                className="btn-primary" 
                style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', gap: '8px', textTransform: 'none', letterSpacing: '0', fontSize: '0.85rem' }}
              >
                Portal Oficial PJUD <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Busca cualquier tema legal. Ej: 'despido indirecto funcionarios públicos', 'reajuste IPC excesivo arrendamiento'..." 
                  style={{ width: '100%', padding: '18px 18px 18px 50px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', outline: 'none', fontSize: '1rem' }} 
                />
              </div>
              <button onClick={handleSearch} className="btn-primary" style={{ width: 'auto', padding: '0 30px' }}>BUSCAR</button>
            </div>

            <div style={{ marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', background: 'rgba(14, 165, 233, 0.04)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.15)', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <span>
                <strong>Acceso Directo al PJUD:</strong> Debido a que el portal del Poder Judicial chileno bloquea los enlaces directos externos por control de sesión, nuestro buscador genera una <strong>Búsqueda Indexada Inteligente</strong>. Al hacer clic en <em>"Ver en PJUD"</em>, el primer enlace en pantalla te abrirá directamente la sentencia o PDF oficial en el servidor de la Corte.
              </span>
            </div>

            {isSearching && (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--accent-gold)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ color: 'var(--accent-gold)', fontWeight: 500 }}>Consultando sentencias y estructurando jurisprudencia del PJUD...</p>
              </div>
            )}

            {searchResults && (
              <div className="animate-fade-in">
                <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '1.2rem', fontWeight: 600 }}>Resultados Encontrados ({searchResults.length})</h3>
                
                {searchResults.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No se encontraron fallos específicos relacionados en la base de datos. Intente ampliando la búsqueda.</p>
                ) : (
                  searchResults.map((res, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '30px', borderLeft: '4px solid var(--accent-gold)', marginBottom: '25px', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {res.rol}
                            <span style={{ fontSize: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', color: 'var(--accent-gold)', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>{res.materia}</span>
                          </h4>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{res.tribunal} • Año {res.fecha}</span>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '20px' }}>
                        <strong style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Doctrina / Extracto Clave:</strong>
                        <p style={{ fontStyle: 'italic', color: '#cbd5e1', lineHeight: '1.7', background: 'rgba(0,0,0,0.25)', padding: '15px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                          "{res.extracto}"
                        </p>
                      </div>

                      {res.sintesis && (
                        <div style={{ marginBottom: '20px' }}>
                          <strong style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>Síntesis de Impacto Jurídico:</strong>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>{res.sintesis}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                        <button 
                          onClick={() => copyToClipboard(res.rol)}
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Copy size={12} /> {copiedRol === res.rol ? '¡Copiado!' : 'Copiar Rol'}
                        </button>
                        <a 
                          href={res.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid var(--accent-teal)', color: 'var(--accent-teal)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <ExternalLink size={12} /> Ver en PJUD (Búsqueda Exacta)
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Vista: Configuración */}
        {currentView === 'configuracion' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}><Settings size={32} color="var(--text-secondary)" /><h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Panel de Control</h1></div>
             <div style={{ display: 'grid', gap: '30px' }}>
                <div className="glass-panel" style={{ padding: '30px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <h4 style={{ fontSize: '1.2rem', color: 'var(--success-green)', display: 'flex', alignItems: 'center', gap: '10px' }}><RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} /> Pipelines Automatizados</h4>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Estado: OK</span>
                   </div>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Última sincronización programada con sentencias del Poder Judicial y el Diario Oficial: <strong>{lastUpdate}</strong></p>
                   <button className="btn-primary" onClick={runManualSync} disabled={isSyncing} style={{ width: 'auto', marginBottom: '25px' }}>{isSyncing ? 'Sincronizando...' : 'Sincronización Manual PJUD'}</button>
                   <div style={{ background: '#000', padding: '20px', borderRadius: '12px', border: '1px solid #333', fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f0', height: '200px', overflowY: 'auto', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                      <div style={{ color: '#666', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>LexAuditor System Console v1.0.5</div>
                      {syncLogs.map((log, i) => <div key={i} style={{ marginBottom: '8px' }}><span style={{ color: '#555' }}>[{new Date().toLocaleTimeString()}]</span> {log}</div>)}
                      {isSyncing && <div style={{ width: '8px', height: '15px', background: '#0f0', display: 'inline-block', animation: 'blink 1s infinite' }}></div>}
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-spin { animation: spin 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default MockViews;

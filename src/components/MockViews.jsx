import React, { useState } from 'react';
import { 
  FolderOpen, Scale, Settings, Search, Trash2, ExternalLink, 
  Plus, FileText, CheckCircle2, BookOpen, RefreshCw, Terminal, 
  AlertCircle, ShieldAlert, Zap, Gavel, TrendingUp, ChevronRight
} from 'lucide-react';

const MockViews = ({ currentView, savedContracts, onDeleteContract, onAddContract, onOpenContract }) => {
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  
  const [aiModel, setAiModel] = useState('Gemini 1.5 Pro');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("Hoy a las 03:00 AM");

  // Estados para el Simulador
  const [simState, setSimState] = useState('idle'); // idle, running, result
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [riskLevel, setRiskLevel] = useState(0);

  const scenarios = [
    { 
      id: 1, title: 'Demanda por Subordinación', 
      desc: 'El trabajador exige reconocimiento de relación laboral por cumplir horario.',
      risk: 85, color: 'var(--alert-red)', 
      verdict: 'EMPRESA PIERDE',
      details: 'La Corte Suprema ha fallado consistentemente que el control horario es indicio de subordinación (Art. 7 Código del Trabajo).' 
    },
    { 
      id: 2, title: 'Retención de Garantía', 
      desc: 'El arrendatario demanda devolución de garantía tras término de contrato.',
      risk: 45, color: 'var(--alert-yellow)', 
      verdict: 'RESULTADO INCIERTO',
      details: 'Dependerá de la acreditación de daños estructurales vs desgaste natural.' 
    },
    { 
      id: 3, title: 'Incumplimiento de NDA', 
      desc: 'Fuga de datos por ex-empleado con cláusula de vigencia perpetua.',
      risk: 20, color: 'var(--success-green)', 
      verdict: 'EMPRESA GANA (PARCIAL)',
      details: 'Aunque la perpetuidad es nula, el tribunal suele reconocer una vigencia razonable de 2 a 5 años.' 
    }
  ];

  const runSimulation = (scenario) => {
    setSelectedScenario(scenario);
    setSimState('running');
    setRiskLevel(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setRiskLevel(progress);
      if (progress >= scenario.risk) {
        clearInterval(interval);
        setSimState('result');
      }
    }, 50);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDocName || !newSectionName) return;
    onAddContract({ name: newDocName.includes('.') ? newDocName : `${newDocName}.pdf`, date: new Date().toLocaleDateString('es-CL'), section: newSectionName, status: 'Pendiente' });
    setNewDocName(''); setShowAddForm(false);
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    setIsSearching(true); setSearchResults(null);
    setTimeout(() => {
      setIsSearching(false);
      const query = searchQuery.toLowerCase();
      if (query.includes('honorario') || query.includes('laboral')) {
        setSearchResults([
          { rol: "Corte Suprema - Rol N° 12.345-2023", materia: "Relación Laboral", extracto: "...la subordinación se presume ante la existencia de órdenes directas...", fecha: "15/08/2023", match: "98%", url: "https://juris.pjud.cl/" }
        ]);
      } else {
        setSearchResults([]);
      }
    }, 1500);
  };

  const runManualSync = () => {
    setIsSyncing(true); setSyncLogs([]);
    const logs = ["Iniciando pipeline...", "Consultando PJUD...", "Vectorizando fallos...", "Actualización exitosa."];
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
              <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary" style={{ width: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}><Plus size={18} /> NUEVO ARCHIVO</button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAdd} className="glass-panel glow-active" style={{ padding: '25px', marginBottom: '40px', border: '1px dashed var(--accent-teal)', background: 'rgba(14, 165, 233, 0.02)' }}>
                <h4 style={{ marginBottom: '20px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '10px' }}><Zap size={18} /> Registrar Nuevo Documento</h4>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} type="text" placeholder="Carpeta / Sección" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white' }} />
                  <input value={newDocName} onChange={(e) => setNewDocName(e.target.value)} type="text" placeholder="Nombre del PDF" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white' }} />
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Añadir</button>
                </div>
              </form>
            )}

            {savedContracts.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}>
                <FolderOpen size={48} color="var(--text-secondary)" style={{ marginBottom: '20px', opacity: 0.3 }} />
                <h4 style={{ color: 'white', marginBottom: '10px', fontSize: '1.2rem' }}>Tu Repositorio está Vacío</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                  No hay contratos registrados en tu cuenta. Sube un documento en "Nueva Auditoría" para iniciar el análisis legal e IA.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 15px', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.8rem', color: 'var(--success-green)' }}>
                  <span>🔒</span>
                  <span><strong>Privacidad al 100%:</strong> Tus archivos se analizan en memoria de tu navegador y no se guardan en servidores públicos ni bases de datos externas.</span>
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
                        <h4 style={{ color: 'white', marginBottom: '5px', fontSize: '1.05rem' }}>{doc.name}</h4>
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

        {/* Vista: Simulador de Juicios */}
        {currentView === 'simulador_juicios' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '15px' }}><Scale size={40} color="var(--alert-red)" /></div>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Litigation Predictor</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Análisis estocástico de resultados judiciales en Chile.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Escenarios */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldAlert size={20} color="var(--accent-gold)" /> Escenarios de Crisis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {scenarios.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => runSimulation(s)}
                      className="premium-card"
                      style={{ cursor: 'pointer', borderLeft: selectedScenario?.id === s.id ? `4px solid ${s.color}` : '1px solid var(--border-color)', transform: selectedScenario?.id === s.id ? 'translateX(10px)' : 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong style={{ color: 'white' }}>{s.title}</strong>
                        <ChevronRight size={18} color="var(--text-secondary)" />
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resultados e IA */}
              <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
                {simState === 'idle' && (
                  <div style={{ opacity: 0.5 }}>
                    <Gavel size={80} style={{ marginBottom: '20px' }} />
                    <h4>Selecciona un escenario para iniciar la simulación</h4>
                  </div>
                )}

                {simState === 'running' && (
                  <div className="animate-fade-in">
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '8px solid rgba(255,255,255,0.05)', borderTop: '8px solid var(--accent-teal)', animation: 'spin 1s linear infinite', margin: '0 auto 30px' }}></div>
                    <h3 style={{ color: 'var(--accent-teal)' }}>Consultando Jurisprudencia...</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Procesando {selectedScenario?.title}</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {simState === 'result' && (
                  <div className="animate-fade-in" style={{ width: '100%' }}>
                    <div style={{ marginBottom: '30px' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 800, color: selectedScenario.color }}>{riskLevel}%</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Probabilidad de Derrota</div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '15px', overflow: 'hidden' }}>
                        <div style={{ width: `${riskLevel}%`, height: '100%', background: selectedScenario.color, transition: 'width 1s ease-out' }}></div>
                      </div>
                    </div>

                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${selectedScenario.color}` }}>
                      <h4 style={{ color: selectedScenario.color, marginBottom: '10px', fontWeight: 700 }}>VERDICTO ESTIMADO: {selectedScenario.verdict}</h4>
                      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6' }}>{selectedScenario.details}</p>
                    </div>
                    
                    <button onClick={() => setSimState('idle')} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>Reiniciar simulador</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vista: Base Jurisprudencial */}
        {currentView === 'base_jurisprudencial' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '12px' }}><TrendingUp size={32} color="var(--accent-gold)" /></div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Smart Search RAG</h1>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Ej: 'honorarios subordinación', 'ajuste IPC arriendo'..." 
                  style={{ width: '100%', padding: '18px 18px 18px 50px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', outline: 'none', fontSize: '1rem' }} 
                />
              </div>
              <button onClick={handleSearch} className="btn-primary" style={{ width: 'auto', padding: '0 30px' }}>BUSCAR</button>
            </div>

            {isSearching && (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--accent-gold)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ color: 'var(--accent-gold)', fontWeight: 500 }}>Vectorizando query y consultando Pinecone...</p>
              </div>
            )}

            {searchResults && searchResults.map((res, idx) => (
              <div key={idx} className="premium-card animate-fade-in" style={{ borderLeft: '4px solid var(--accent-gold)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '1.2rem' }}>{res.rol}</h4>
                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 700 }}>{res.match} DE SIMILITUD VECTORIAL</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{res.fecha}</span>
                </div>
                <p style={{ fontStyle: 'italic', color: '#cbd5e1', lineHeight: '1.7', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>"{res.extracto}"</p>
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <a href={res.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Ver en Poder Judicial <ExternalLink size={14} /></a>
                </div>
              </div>
            ))}
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
                   <button className="btn-primary" onClick={runManualSync} disabled={isSyncing} style={{ width: 'auto', marginBottom: '25px' }}>{isSyncing ? 'Sincronizando...' : 'Sincronización Manual PJUD'}</button>
                   <div style={{ background: '#000', padding: '20px', borderRadius: '12px', border: '1px solid #333', fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f0', height: '200px', overflowY: 'auto', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                      <div style={{ color: '#666', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>LexAuditor System Console v1.0.4</div>
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

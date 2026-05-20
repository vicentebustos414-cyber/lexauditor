import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DocumentViewer from './components/DocumentViewer';
import CoworkerPanel from './components/CoworkerPanel';
import MockViews from './components/MockViews';
import LoginScreen from './components/LoginScreen';
import './index.css';

function App() {
  const [appState, setAppState] = useState('login'); 
  const [activeAlert, setActiveAlert] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Mis Contratos');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [contractType, setContractType] = useState('Honorarios');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Repositorios independientes por usuario persistidos en el navegador local (Privacidad 100% de IP/Dispositivo)
  const [allRepos, setAllRepos] = useState(() => {
    try {
      const saved = localStorage.getItem('lexauditor_repos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.warn("LocalStorage no disponible:", e);
      return {};
    }
  });

  useEffect(() => {
    try {
      if (allRepos && typeof allRepos === 'object') {
        localStorage.setItem('lexauditor_repos', JSON.stringify(allRepos));
      }
    } catch (e) {
      console.error("Error guardando repositorios en localStorage:", e);
    }
  }, [allRepos]);
  
  const [contractData, setContractData] = useState({
    'riesgo-subordinacion': { isFixed: false, original: "estando bajo las órdenes directas del Gerente de Operaciones", fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo" },
    'ilegal-retencion': { isFixed: false, original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento", fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados" }
  });

  const handleLogin = (identifier, isGuest) => {
    setCurrentUser(identifier);
    // Cada usuario inicia con un repositorio 100% vacío para garantizar absoluta privacidad y confidencialidad
    const safeRepos = allRepos && typeof allRepos === 'object' ? allRepos : {};
    if (!safeRepos[identifier]) {
      setAllRepos(prev => ({ 
        ...(prev && typeof prev === 'object' ? prev : {}), 
        [identifier]: [] 
      }));
    }
    setAppState('mis_contratos');
    setActiveMenu('Mis Contratos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppState('login');
  };

  const startAnalysis = async (file, type) => {
    setActiveAlert(null);
    setUploadedFile(file);
    setContractType(type);
    setAppState('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contractType', type);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/audit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Servidor no disponible para análisis real');
      }

      const data = await response.json();
      setContractData(data);

      // Guardar el contrato en el repositorio del usuario (persistencia local)
      const newContract = {
        id: Date.now(),
        name: file.name,
        date: new Date().toLocaleDateString('es-CL'),
        section: type === 'Honorarios' ? 'Laboral' : type === 'Arriendo' ? 'Comercial' : 'Confidencialidad',
        status: 'Alerta',
        contractType: type,
        data: data
      };
      setAllRepos(prev => {
        const safePrev = prev && typeof prev === 'object' ? prev : {};
        return {
          ...safePrev,
          [currentUser]: [newContract, ...(safePrev[currentUser] || [])]
        };
      });

    } catch (err) {
      console.warn('Falló el backend seguro, usando simulación local integrada:', err);
      // Simular carga de datos específicos según el tipo
      const mockData = {
        'Honorarios': {
          'riesgo-subordinacion': { isFixed: false, original: "estando bajo las órdenes directas del Gerente de Operaciones", fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo" },
          'ilegal-retencion': { isFixed: false, original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento", fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados" }
        },
        'Arriendo': {
          'clausula-ajuste': { isFixed: false, original: "la renta se reajustará mensualmente según el IPC más un 5% adicional de interés", fixed: "la renta se reajustará semestralmente según la variación del IPC informado por el Instituto Nacional de Estadísticas" },
          'garantia-abusiva': { isFixed: false, original: "el arrendador podrá retener la garantía por cualquier daño estético menor sin necesidad de rendir cuentas", fixed: "la garantía será devuelta en un plazo de 30 días, descontando solo daños estructurales debidamente acreditados con facturas" }
        },
        'NDA': {
          'plazo-eterno': { isFixed: false, original: "la obligación de confidencialidad será perpetua e irrevocable para todos los herederos", fixed: "la obligación de confidencialidad tendrá una duración de 5 años contados desde el término de la relación comercial" }
        }
      };
      const finalData = mockData[type] || mockData['Honorarios'];
      setContractData(finalData);

      // Guardar incluso en modo de simulación
      const newContract = {
        id: Date.now(),
        name: file.name,
        date: new Date().toLocaleDateString('es-CL'),
        section: type === 'Honorarios' ? 'Laboral' : type === 'Arriendo' ? 'Comercial' : 'Confidencialidad',
        status: 'Alerta',
        contractType: type,
        data: finalData
      };
      setAllRepos(prev => {
        const safePrev = prev && typeof prev === 'object' ? prev : {};
        return {
          ...safePrev,
          [currentUser]: [newContract, ...(safePrev[currentUser] || [])]
        };
      });

    } finally {
      setTimeout(() => {
        setAppState('dashboard');
        setActiveMenu('Auditoría Activa');
      }, 1500);
    }
  };


  const handleApplyAmendment = (alertId) => {
    setContractData(prev => {
      if (!prev) return prev;
      if (prev.findings && Array.isArray(prev.findings)) {
        return {
          ...prev,
          findings: prev.findings.map(f => f.id === alertId ? { ...f, isFixed: true } : f)
        };
      }
      return { ...prev, [alertId]: { ...prev[alertId], isFixed: true } };
    });
    setActiveAlert(null); 
  };

  const openContract = (doc) => {
    setActiveAlert(null);
    const mockTemplates = {
      'Honorarios': {
        'riesgo-subordinacion': { isFixed: false, original: "estando bajo las órdenes directas del Gerente de Operaciones", fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo" },
        'ilegal-retencion': { isFixed: false, original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento", fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados" }
      },
      'Arriendo': {
        'clausula-ajuste': { isFixed: false, original: "la renta se reajustará mensualmente según el IPC más un 5% adicional de interés", fixed: "la renta se reajustará semestralmente según la variación del IPC informado por el Instituto Nacional de Estadísticas" },
        'garantia-abusiva': { isFixed: false, original: "el arrendador podrá retener la garantía por cualquier daño estético menor sin necesidad de rendir cuentas", fixed: "la garantía será devuelta en un plazo de 30 días, descontando solo daños estructurales debidamente acreditados con facturas" }
      },
      'NDA': {
        'plazo-eterno': { isFixed: false, original: "la obligación de confidencialidad será perpetua e irrevocable para todos los herederos", fixed: "la obligación de confidencialidad tendrá una duración de 5 años contados desde el término de la relación comercial" }
      }
    };
    const resolvedType = doc.contractType || (doc.section === 'Comercial' ? 'Arriendo' : doc.section === 'Confidencialidad' ? 'NDA' : 'Honorarios');
    setContractData(doc.data || mockTemplates[resolvedType]);
    setUploadedFile({ name: doc.name, size: 0 }); // Spoof file object
    setContractType(resolvedType);
    setAppState('dashboard');
    setActiveMenu('Auditoría Activa');
  };

  const navigateTo = (menuItem) => {
    setActiveMenu(menuItem);
    if (menuItem === 'Auditoría Activa' || menuItem === 'Dashboard') { 
      setAppState('dashboard'); 
    } 
    else if (menuItem === 'Subir Contrato') { setAppState('subir_contrato'); }
    else if (menuItem === 'Mis Contratos') { setAppState('mis_contratos'); } 
    else if (menuItem === 'Base Jurisprudencial') { setAppState('base_jurisprudencial'); } 
    else if (menuItem === 'Configuración') { setAppState('configuracion'); }
  };

  const currentContracts = (allRepos && typeof allRepos === 'object' && currentUser ? allRepos[currentUser] : []) || [];

  const deleteContract = (id) => {
    setAllRepos(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const userContracts = safePrev[currentUser] || [];
      return {
        ...safePrev,
        [currentUser]: userContracts.filter(c => c.id !== id)
      };
    });
  };
  
  const addContract = (newContract) => {
    setAllRepos(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const userContracts = safePrev[currentUser] || [];
      return {
        ...safePrev,
        [currentUser]: [{ ...newContract, id: Date.now() }, ...userContracts]
      };
    });
  };

  if (appState === 'login') return <LoginScreen onLoginSuccess={handleLogin} />;

  return (
    <div className="app-container">
      <Sidebar 
        onNavigate={navigateTo} 
        activeMenu={activeMenu} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        hasActiveContract={!!uploadedFile}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {appState === 'analyzing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '40px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid rgba(14, 165, 233, 0.1)', borderTopColor: 'var(--accent-teal)', animation: 'spin 1s linear infinite', marginBottom: '25px' }}></div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '10px', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analizando Documento con IA</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '480px', textAlign: 'center', lineHeight: '1.6' }}>
              Extrayendo texto del PDF y evaluando cláusulas en base a la legislación y jurisprudencia chilena vigente...
            </p>
          </div>
        )}
        {appState === 'dashboard' && (
          <>
            <DocumentViewer onTextClick={(id) => setActiveAlert(id)} contractData={contractData} contractType={contractType} uploadedFile={uploadedFile} />
            <CoworkerPanel activeAlert={activeAlert} onApply={handleApplyAmendment} contractData={contractData} />
          </>
        )}
        {(appState === 'mis_contratos' || appState === 'subir_contrato' || appState === 'base_jurisprudencial' || appState === 'configuracion') && (
          <MockViews 
            currentView={appState} 
            savedContracts={currentContracts} 
            onDeleteContract={deleteContract}
            onAddContract={addContract}
            onOpenContract={openContract}
            onUploadContract={startAnalysis}
            onNavigate={navigateTo}
          />
        )}
      </div>
    </div>
  );
}
export default App;

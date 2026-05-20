import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DocumentViewer from './components/DocumentViewer';
import CoworkerPanel from './components/CoworkerPanel';
import UploadScreen from './components/UploadScreen';
import MockViews from './components/MockViews';
import LoginScreen from './components/LoginScreen';
import './index.css';

function App() {
  const [appState, setAppState] = useState('login'); 
  const [activeAlert, setActiveAlert] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Nueva Auditoría');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [contractType, setContractType] = useState('Honorarios');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Repositorios independientes por usuario
  const [allRepos, setAllRepos] = useState({});
  
  const [contractData, setContractData] = useState({
    'riesgo-subordinacion': { isFixed: false, original: "estando bajo las órdenes directas del Gerente de Operaciones", fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo" },
    'ilegal-retencion': { isFixed: false, original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento", fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados" }
  });

  const handleLogin = (identifier, isGuest) => {
    setCurrentUser(identifier);
    // Si el usuario es nuevo (o invitado), le creamos un repositorio predeterminado para que tenga algo que ver
    if (!allRepos[identifier]) {
      setAllRepos(prev => ({ 
        ...prev, 
        [identifier]: isGuest ? [
          { id: 901, name: 'Demo_Arriendo_Local.pdf', date: new Date().toLocaleDateString('es-CL'), section: 'Demo Comercial', status: 'Seguro' },
          { id: 902, name: 'Demo_Contrato_Trabajo.docx', date: new Date().toLocaleDateString('es-CL'), section: 'Demo Laboral', status: 'Alerta' }
        ] : [] 
      }));
    }
    setAppState('upload');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppState('login');
  };

  const startAnalysis = async (file, type) => {
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
      setContractData(mockData[type] || mockData['Honorarios']);
    } finally {
      setTimeout(() => {
        setAppState('dashboard');
        setActiveMenu('Auditoría Activa');
      }, 1500);
    }
  };


  const handleApplyAmendment = (alertId) => {
    setContractData(prev => ({ ...prev, [alertId]: { ...prev[alertId], isFixed: true } }));
    setActiveAlert(null); 
  };

  const navigateTo = (menuItem) => {
    setActiveMenu(menuItem);
    if (menuItem === 'Nueva Auditoría') {
      setAppState('upload'); 
      setActiveAlert(null);
      setUploadedFile(null); // Resetear contrato activo para limpiar la barra lateral
    } else if (menuItem === 'Auditoría Activa' || menuItem === 'Dashboard') { 
      setAppState('dashboard'); 
    } 
    else if (menuItem === 'Mis Contratos') { setAppState('mis_contratos'); } 
    else if (menuItem === 'Base Jurisprudencial') { setAppState('base_jurisprudencial'); } 
    else if (menuItem === 'Simulador de Juicios') { setAppState('simulador_juicios'); } 
    else if (menuItem === 'Configuración') { setAppState('configuracion'); }
  };

  const currentContracts = allRepos[currentUser] || [];

  const deleteContract = (id) => {
    setAllRepos(prev => ({ ...prev, [currentUser]: prev[currentUser].filter(c => c.id !== id) }));
  };
  
  const addContract = (newContract) => {
    setAllRepos(prev => ({ ...prev, [currentUser]: [{ ...newContract, id: Date.now() }, ...(prev[currentUser] || [])] }));
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
        {appState === 'upload' && <UploadScreen onUpload={startAnalysis} />}
        {appState === 'analyzing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--accent-teal)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ marginTop: '30px', color: 'var(--text-primary)' }}>Analizando normativa chilena...</h2>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {appState === 'dashboard' && (
          <>
            <DocumentViewer onTextClick={(id) => setActiveAlert(id)} contractData={contractData} contractType={contractType} uploadedFile={uploadedFile} />
            <CoworkerPanel activeAlert={activeAlert} onApply={handleApplyAmendment} contractData={contractData} />
          </>
        )}
        {(appState === 'mis_contratos' || appState === 'base_jurisprudencial' || appState === 'configuracion' || appState === 'simulador_juicios') && (
          <MockViews 
            currentView={appState} 
            savedContracts={currentContracts} 
            onDeleteContract={deleteContract}
            onAddContract={addContract}
          />
        )}
      </div>
    </div>
  );
}
export default App;

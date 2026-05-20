import React from 'react';
import { LayoutDashboard, FileSearch, FolderOpen, Scale, Gavel, Settings, UserCircle, LogOut } from 'lucide-react';

const Sidebar = ({ onNavigate, activeMenu, currentUser, onLogout, hasActiveContract }) => {

  const menuItems = [];
  
  if (hasActiveContract) {
    menuItems.push({ name: 'Auditoría Activa', icon: <LayoutDashboard size={20} /> });
  }

  menuItems.push(
    { name: 'Mis Contratos', icon: <FolderOpen size={20} /> },
    { name: 'Base Jurisprudencial', icon: <Scale size={20} /> },
    { name: 'Simulador de Juicios', icon: <Gavel size={20} /> },
    { name: 'Configuración', icon: <Settings size={20} /> }
  );

  return (
    <div style={{ width: '260px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      
      <div style={{ padding: '30px 25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-teal), #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Scale size={18} color="white" />
        </div>
        <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.5px' }}>
          LexAuditor <span style={{ color: 'var(--accent-teal)' }}>CL</span>
        </h2>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 15px', flex: 1 }}>
        {menuItems.map((item, i) => {
          const isActive = activeMenu === item.name;
          return (
            <div key={i} onClick={() => onNavigate(item.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', borderRadius: '8px',
                color: isActive ? 'white' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: isActive ? 500 : 400, transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid var(--accent-teal)' : '3px solid transparent'
              }}
              onMouseOver={(e) => { if(!isActive) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; } }}
              onMouseOut={(e) => { if(!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
            >
              <span style={{ color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>{item.icon}</span>
              {item.name}
            </div>
          )
        })}
      </div>

      {/* ÁREA DE USUARIO CON LOGOUT */}
      <div style={{ padding: '20px 15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserCircle size={32} color="var(--accent-teal)" />
            <div style={{ overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sesión Segura</span>
              <strong style={{ color: 'white', fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100px', display: 'block', overflow: 'hidden' }}>{currentUser}</strong>
            </div>
          </div>
          <button onClick={onLogout} title="Cerrar Sesión" style={{ background: 'transparent', border: 'none', color: 'var(--alert-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </div>
  );
};
export default Sidebar;

import React, { useState } from 'react';
import { Scale, MailCheck, User } from 'lucide-react';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleGoogleLogin = () => {
    if (!email) {
      alert("Por favor ingresa un correo de Google para la demo.");
      return;
    }
    setIsLoggingIn(true);
    
    setTimeout(() => {
      setIsLoggingIn(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        onLoginSuccess(email, false); // No es invitado
      }, 3000);
      
    }, 2000);
  };

  const handleGuestLogin = () => {
    onLoginSuccess('Invitado', true); // Es invitado
  };

  if (showSuccess) {
    return (
      <div className="animate-fade-in" style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)' }}>
        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--success-green)', boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)' }}>
          <MailCheck size={64} color="var(--success-green)" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: 'white', marginBottom: '15px' }}>¡Registro Exitoso!</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Hemos creado un Repositorio Encriptado único para <strong>{email}</strong>. Nadie más podrá ver tus contratos.
          </p>
          <div style={{ marginTop: '30px', width: '30px', height: '30px', borderRadius: '50%', border: '3px solid var(--accent-teal)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '30px auto 0' }}></div>
          <p style={{ color: 'var(--accent-teal)', fontSize: '0.8rem', marginTop: '15px' }}>Redirigiendo a tu entorno seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'url("https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop") center/cover' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 4, 10, 0.85)', backdropFilter: 'blur(8px)' }}></div>

      <div className="glass-panel" style={{ padding: '60px 50px', width: '100%', maxWidth: '450px', position: 'relative', zIndex: 1, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-teal), #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.3)' }}>
          <Scale size={32} color="white" />
        </div>
        
        <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '10px' }}>LexAuditor <span style={{ color: 'var(--accent-teal)' }}>CL</span></h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>Auditoría Inteligente de Contratos</p>

        {isLoggingIn ? (
          <div style={{ padding: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--accent-gold)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--accent-gold)' }}>Conectando con Google Workspace...</p>
          </div>
        ) : (
          <div>
            <input 
              type="email" 
              placeholder="Ingresa tu correo Google" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', outline: 'none' }}
            />
            <button 
              onClick={handleGoogleLogin}
              style={{ 
                width: '100%', padding: '15px 20px', background: 'white', color: '#333', border: 'none', borderRadius: '8px', 
                fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s', marginBottom: '15px'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Continuar con Google
            </button>
            
            <div style={{ position: 'relative', margin: '25px 0' }}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', position: 'absolute', top: '50%', width: '100%', zIndex: 0 }}></div>
              <span style={{ background: 'var(--bg-secondary)', padding: '0 15px', color: 'var(--text-secondary)', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>o</span>
            </div>

            <button 
              onClick={handleGuestLogin}
              style={{ 
                width: '100%', padding: '15px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', 
                fontSize: '1rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <User size={18} /> Entrar como Invitado
            </button>
          </div>
        )}
        <div style={{ marginTop: '30px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
          Protegido bajo encriptación End-to-End <br/> Sus repositorios son 100% privados.
        </div>
      </div>
    </div>
  );
};
export default LoginScreen;

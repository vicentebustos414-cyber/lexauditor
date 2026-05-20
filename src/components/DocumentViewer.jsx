import React, { useState, useEffect } from 'react';
import { CheckCircle, Languages, X, Move, MessageSquare, ArrowUp, PenTool } from 'lucide-react';

const DocumentViewer = ({ onTextClick, contractData, contractType, uploadedFile }) => {
  const [showTranslator, setShowTranslator] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Hola, soy tu asistente LexAuditor. ¿Tienes alguna duda sobre este contrato?' }
  ]);
  const [signatureStep, setSignatureStep] = useState('none'); // none, prompt, loading, success

  // Estados para la funcionalidad de arrastrar (Drag)
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setModalPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y
    });
  };

  const openTranslator = () => {
    setModalPos({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 250 });
    setShowTranslator(true);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.toLowerCase();
    setChatMessages([...chatMessages, { role: 'user', text: chatInput }]);
    setChatInput('');

    // Simulación de respuesta IA basada en el contrato
    setTimeout(() => {
      let aiResponse = "Lo siento, no encuentro esa información específica en el documento. ¿Puedes ser más preciso?";
      
      if (userMsg.includes('renunciar') || userMsg.includes('termino') || userMsg.includes('plazo')) {
        aiResponse = "El contrato establece un término anticipado. Sin embargo, hemos detectado que la cláusula de retención de honorarios es abusiva según la jurisprudencia chilena.";
      } else if (userMsg.includes('pago') || userMsg.includes('dinero') || userMsg.includes('honorarios')) {
        aiResponse = "Los honorarios se pagan a los 30 días posteriores al cierre de mes, previa entrega de la boleta de honorarios correspondiente.";
      } else if (userMsg.includes('ordenes') || userMsg.includes('jefe') || userMsg.includes('horario')) {
        aiResponse = "Cuidado: El texto original sugiere que estás bajo órdenes directas, lo cual podría implicar una relación laboral encubierta (Art. 7 Código del Trabajo).";
      }

      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    }, 1000);
  };

  const handleSignFlow = () => {
    setSignatureStep('loading');
    setTimeout(() => {
      setSignatureStep('success');
    }, 2500);
  };

  const renderContent = () => {
    const safeContractData = contractData || {};
    if (contractType === 'Arriendo') {
      return (
        <div style={{ fontSize: '1.05rem', lineHeight: '2', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '25px' }}>En Santiago, a {new Date().toLocaleDateString()}, comparecen Don/Doña Arrendador y por otra parte el Arrendatario...</p>
          <p style={{ marginBottom: '25px' }}><strong>PRIMERO:</strong> El inmueble se entrega en condiciones óptimas de habitabilidad.</p>
          <p style={{ marginBottom: '25px' }}>
            <strong>SEGUNDO (Renta):</strong> La renta de arrendamiento será de $500.000 mensuales. 
            {!safeContractData['clausula-ajuste']?.isFixed ? (
              <span className="highlight-yellow" onClick={() => onTextClick('clausula-ajuste')}>{safeContractData['clausula-ajuste']?.original}</span>
            ) : (
              <span style={{ color: 'var(--success-green)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--success-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={14} /> {safeContractData['clausula-ajuste']?.fixed}
              </span>
            )}
          </p>
          <p style={{ marginBottom: '25px' }}>
            <strong>TERCERO (Garantía):</strong> Se entrega un mes de garantía. 
            {!safeContractData['garantia-abusiva']?.isFixed ? (
              <span className="highlight-red" onClick={() => onTextClick('garantia-abusiva')}>{safeContractData['garantia-abusiva']?.original}</span>
            ) : (
              <span style={{ color: 'var(--success-green)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--success-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={14} /> {safeContractData['garantia-abusiva']?.fixed}
              </span>
            )}
          </p>
        </div>
      );
    } else if (contractType === 'NDA') {
      return (
        <div style={{ fontSize: '1.05rem', lineHeight: '2', color: '#cbd5e1' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>ACUERDO DE CONFIDENCIALIDAD</h2>
          <p style={{ marginBottom: '25px' }}>Las Partes se obligan a mantener estricta reserva sobre toda la información intercambiada...</p>
          <p style={{ marginBottom: '25px' }}>
            <strong>CLÁUSULA QUINTA (Vigencia):</strong> 
            {!safeContractData['plazo-eterno']?.isFixed ? (
              <span className="highlight-red" onClick={() => onTextClick('plazo-eterno')}>{safeContractData['plazo-eterno']?.original}</span>
            ) : (
              <span style={{ color: 'var(--success-green)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--success-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={14} /> {safeContractData['plazo-eterno']?.fixed}
              </span>
            )}
          </p>
        </div>
      );
    }

    // Default: Honorarios
    return (
      <div style={{ fontSize: '1.05rem', lineHeight: '2', color: '#cbd5e1' }}>
        <p style={{ marginBottom: '25px' }}>En Santiago de Chile, a {new Date().toLocaleDateString()}, entre EMPRESA XYZ SPA... y por la otra parte el Trabajador Independiente...</p>

        <p style={{ marginBottom: '25px', transition: 'all 0.5s' }}>
          <strong>TERCERO:</strong> El prestador de servicios deberá cumplir con sus labores, 
          {!safeContractData['riesgo-subordinacion']?.isFixed ? (
            <span className="highlight-yellow" onClick={() => onTextClick('riesgo-subordinacion')} title="Riesgo Legal - Clic para ver">{safeContractData['riesgo-subordinacion']?.original}</span>
          ) : (
            <span style={{ color: 'var(--success-green)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--success-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={14} /> {safeContractData['riesgo-subordinacion']?.fixed}
            </span>
          )}
          , debiendo reportar avances según se acuerde.
        </p>

        <p style={{ marginBottom: '25px' }}><strong>CUARTO:</strong> Los honorarios se pagarán contra entrega de boleta, a los 30 días posteriores al cierre de mes.</p>

        <p style={{ marginBottom: '25px', transition: 'all 0.5s' }}>
          <strong>SÉPTIMO:</strong> En caso de término anticipado del presente contrato, 
          {!safeContractData['ilegal-retencion']?.isFixed ? (
            <span className="highlight-red" onClick={() => onTextClick('ilegal-retencion')} title="Ilegalidad Detectada - Clic para ver">{safeContractData['ilegal-retencion']?.original}</span>
          ) : (
            <span style={{ color: 'var(--success-green)', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--success-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={14} /> {safeContractData['ilegal-retencion']?.fixed}
            </span>
          )}
          .
        </p>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto', position: 'relative', display: 'flex', gap: '20px' }}>
      <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '200px', background: 'radial-gradient(ellipse at top, rgba(14, 165, 233, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

      {/* Contenido Principal del Documento */}
      <div className="glass-panel" style={{ padding: '50px', flex: 1, minHeight: '80vh', position: 'relative', zIndex: 1, maxWidth: showChat ? '65%' : '850px', margin: showChat ? '0' : '0 auto', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <FileText color="var(--accent-teal)" size={28} />
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{contractType === 'Honorarios' ? 'CONTRATO DE PRESTACIÓN DE SERVICIOS' : contractType === 'Arriendo' ? 'CONTRATO DE ARRENDAMIENTO' : 'ACUERDO DE CONFIDENCIALIDAD'}</h1>
              {uploadedFile && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Archivo: {uploadedFile.name}</span>}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowChat(!showChat)}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <MessageSquare size={14} /> {showChat ? 'Cerrar Chat' : 'Chat Legal'}
            </button>
            <button 
              onClick={openTranslator}
              style={{ background: 'linear-gradient(90deg, #eab308, #d97706)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)' }}
            >
              <Languages size={14} /> Legal Design
            </button>
            <button 
              onClick={() => setSignatureStep('prompt')}
              style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}
            >
              <PenTool size={14} /> Firmar Contrato
            </button>
          </div>
        </div>
        
        {renderContent()}

        {signatureStep === 'success' && (
          <div className="animate-fade-in" style={{ marginTop: '50px', padding: '30px', border: '2px solid var(--success-green)', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', textAlign: 'center' }}>
            <div style={{ color: 'var(--success-green)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <CheckCircle size={24} /> DOCUMENTO FIRMADO ELECTRÓNICAMENTE
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Validado mediante ClaveÚnica - Hash: 8f9e2...d3c1 - {new Date().toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Barra Lateral de Chat Legal */}
      {showChat && (
        <div className="glass-panel animate-fade-in" style={{ width: '30%', minWidth: '300px', display: 'flex', flexDirection: 'column', height: '80vh', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare color="var(--accent-teal)" />
            <strong style={{ color: 'white' }}>Asistente LexAuditor</strong>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                padding: '12px 16px',
                borderRadius: '12px',
                maxWidth: '85%',
                fontSize: '0.9rem',
                color: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pregunta sobre el contrato..." 
              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'white', outline: 'none' }}
            />
            <button type="submit" style={{ background: 'var(--accent-teal)', border: 'none', borderRadius: '8px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowUp size={18} color="white" />
            </button>
          </form>
        </div>
      )}

      {/* MODAL DE FIRMA (CLAVEÚNICA) */}
      {signatureStep === 'prompt' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '40px', textAlign: 'center', border: '1px solid var(--accent-teal)' }}>
            <div style={{ marginBottom: '25px' }}>
              <img src="https://logodownload.org/wp-content/uploads/2021/10/clave-unica-logo.png" alt="ClaveÚnica" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
            </div>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>Firma Electrónica Avanzada</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>Vas a firmar el documento mediante el portal oficial de ClaveÚnica. Esto tiene plena validez legal en Chile.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={handleSignFlow} style={{ flex: 1 }}>Confirmar Firma</button>
              <button onClick={() => setSignatureStep('none')} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {signatureStep === 'loading' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid var(--accent-teal)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
          <p style={{ color: 'white', fontWeight: 600 }}>Conectando con servidores del Estado...</p>
        </div>
      )}

      {/* MODAL LENGUAJE CIUDADANO (MOVIBLE) */}
      {showTranslator && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 100 }}>
          <div 
            style={{ 
              position: 'absolute', 
              top: `${modalPos.y}px`, 
              left: `${modalPos.x}px`, 
              background: 'var(--bg-secondary)', 
              width: '600px', 
              borderRadius: '16px', 
              border: '1px solid var(--accent-gold)', 
              overflow: 'hidden', 
              boxShadow: isDragging ? '0 30px 60px rgba(0,0,0,0.8)' : '0 20px 50px rgba(0,0,0,0.5)',
              pointerEvents: 'auto',
              transition: isDragging ? 'none' : 'box-shadow 0.2s',
              userSelect: isDragging ? 'none' : 'auto'
            }}
          >
            <div 
              onMouseDown={handleMouseDown}
              style={{ 
                background: 'linear-gradient(90deg, #eab308, #d97706)', 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                <Languages /> Resumen Ciudadano <Move size={16} style={{ opacity: 0.6, marginLeft: '10px' }} />
              </h2>
              <X color="white" style={{ cursor: 'pointer' }} onClick={() => setShowTranslator(false)} />
            </div>

            <div style={{ padding: '30px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>La IA ha procesado el lenguaje legal complejo y lo ha resumido en 3 puntos clave para que cualquier persona lo entienda antes de firmar:</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--accent-teal)' }}>
                  <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>1. ¿De qué trata este contrato?</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>Te están contratando para dar un servicio independiente (a honorarios), no como empleado fijo.</span>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--accent-gold)' }}>
                  <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>2. ¿Cuándo y cómo te pagan?</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>Te pagarán 30 días DESPUÉS de que termine cada mes, pero debes entregarles una boleta primero.</span>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--alert-red)' }}>
                  <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>3. ¡Atención! Peligros al renunciar</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>Actualmente, si decides irte antes de tiempo, el contrato dice que no te pagarán nada del mes en curso como castigo. (Recomendamos pedir que quiten esta regla).</span>
                </div>
              </div>
              
              <button className="btn-primary" style={{ marginTop: '30px' }} onClick={() => setShowTranslator(false)}>Entendido, cerrar panel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DocumentViewer;

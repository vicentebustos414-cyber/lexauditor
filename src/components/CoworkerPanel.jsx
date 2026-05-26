import React from 'react';
import { AlertTriangle, ShieldAlert, FileEdit, CheckCircle2, Bot, Info } from 'lucide-react';

const CoworkerPanel = ({ activeAlert, onApply, contractData }) => {
  const safeContractData = contractData || {};

  const getComplianceScore = () => {
    let total = 0;
    let fixed = 0;

    if (safeContractData.findings && Array.isArray(safeContractData.findings)) {
      total = safeContractData.findings.length;
      fixed = safeContractData.findings.filter(f => f.isFixed).length;
    } else {
      const keys = Object.keys(safeContractData).filter(key => 
        safeContractData[key] && typeof safeContractData[key] === 'object' && 'isFixed' in safeContractData[key]
      );
      total = keys.length;
      fixed = keys.filter(key => safeContractData[key].isFixed).length;
    }

    if (total === 0) {
      return { 
        percent: 100, 
        label: 'Seguro y Conforme', 
        color: 'var(--success-green)', 
        description: 'El contrato cumple plenamente con la normativa legal chilena.' 
      };
    }

    const percent = Math.round((fixed / total) * 100);
    
    if (percent === 100) {
      return { 
        percent: 100, 
        label: 'Seguro y Conforme', 
        color: 'var(--success-green)', 
        description: 'Todas las cláusulas riesgosas han sido corregidas con enmiendas lícitas chilenas.' 
      };
    }

    if (percent >= 50) {
      return { 
        percent, 
        label: 'Riesgo Parcial', 
        color: 'var(--accent-teal)', 
        description: 'Se han corregido algunos riesgos, pero aún quedan cláusulas por subsanar.' 
      };
    }

    if (total >= 3) {
      return { 
        percent, 
        label: 'Riesgo Crítico', 
        color: 'var(--alert-red)', 
        description: 'Se detectaron múltiples ilegalidades o cláusulas abusivas de alta gravedad.' 
      };
    }

    return { 
      percent, 
      label: 'Riesgo Moderado', 
      color: 'var(--alert-yellow)', 
      description: 'El contrato contiene cláusulas con indicios de subordinación o desproporción.' 
    };
  };
  
  const getAlertData = () => {
    if (!activeAlert) return null;
    
    // Si viene en el formato dinámico de hallazgos del backend
    if (safeContractData.findings && Array.isArray(safeContractData.findings)) {
      const finding = safeContractData.findings.find(f => f.id === activeAlert);
      if (finding) {
        let type = 'warning';
        let title = 'Riesgo Detectado';
        let agent = 'SUBAGENTE 2: RIESGOS';
        let color = 'var(--alert-yellow)';
        
        // Asignar severidad/agente según el ID o contenido
        if (finding.id.includes('ilegal') || finding.id.includes('abusiva') || finding.id.includes('eterno') || finding.id.includes('retencion')) {
          type = 'danger';
          title = 'Ilegalidad Detectada';
          agent = 'SUBAGENTE 1: COMPLIANCE';
          color = 'var(--alert-red)';
        }

        return {
          original: finding.original,
          fixed: finding.fixed,
          risk: finding.risk,
          recommendation: finding.recommendation,
          type,
          title,
          agent,
          color
        };
      }
    }

    // Estructura heredada (Legacy/Mock)
    if (!safeContractData[activeAlert]) return null;
    
    const data = safeContractData[activeAlert];
    let type = 'warning';
    let title = 'Riesgo Detectado';
    let agent = 'SUBAGENTE 2: RIESGOS';
    let color = 'var(--alert-yellow)';

    if (activeAlert.includes('ilegal') || activeAlert.includes('retencion') || activeAlert.includes('abusiva') || activeAlert.includes('eterno')) {
      type = 'danger';
      title = 'Ilegalidad Detectada';
      agent = 'SUBAGENTE 1: COMPLIANCE';
      color = 'var(--alert-red)';
    }

    // Explicaciones estáticas para los mocks heredados
    let risk = '';
    if (activeAlert === 'riesgo-subordinacion') risk = 'Las "órdenes directas" son indicio de subordinación laboral bajo el Art. 7 del Código del Trabajo. Riesgo de demanda por reconocimiento de vínculo laboral.';
    else if (activeAlert === 'ilegal-retencion') risk = 'La retención total de honorarios es desproporcionada y constituye un enriquecimiento sin causa según jurisprudencia chilena.';
    else if (activeAlert === 'clausula-ajuste') risk = 'El ajuste mensual con interés adicional puede considerarse usurario. Se recomienda usar solo IPC semestral.';
    else if (activeAlert === 'garantia-abusiva') risk = 'Retener garantía sin rendición de cuentas ni facturas justificadas vulnera el principio de buena fe contractual en arriendos.';
    else if (activeAlert === 'plazo-eterno') risk = 'Las obligaciones perpetuas de confidencialidad son contrarias al orden público. Debe acotarse a un plazo máximo razonable.';

    return { ...data, risk, type, title, agent, color };
  };

  const alertInfo = getAlertData();

  return (
    <div className="animate-fade-in no-print" style={{ width: '420px', backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: '30px 25px', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
        <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '8px', borderRadius: '8px' }}>
          <Bot size={24} color="var(--accent-teal)" />
        </div>
        <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>IA Auditoría Multimodal</h3>
      </div>

      {/* Medidor de Cumplimiento (Compliance Score Gauge) */}
      {(() => {
        const score = getComplianceScore();
        const radius = 30;
        const strokeWidth = 6;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (score.percent / 100) * circumference;

        return (
          <div className="glass-panel animate-fade-in" style={{ 
            padding: '18px', 
            marginBottom: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px', 
            background: 'rgba(255, 255, 255, 0.01)',
            borderColor: 'rgba(255, 255, 255, 0.04)',
            boxShadow: `0 4px 20px -2px rgba(0,0,0,0.2), 0 0 15px -3px ${score.color}15`
          }}>
            {/* Círculo SVG */}
            <div style={{ position: 'relative', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '72px', height: '72px' }}>
                <circle 
                  cx="36" 
                  cy="36" 
                  r={radius} 
                  fill="transparent" 
                  stroke="rgba(255, 255, 255, 0.03)" 
                  strokeWidth={strokeWidth} 
                />
                <circle 
                  cx="36" 
                  cy="36" 
                  r={radius} 
                  fill="transparent" 
                  stroke={score.color} 
                  strokeWidth={strokeWidth} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{score.percent}%</span>
              </div>
            </div>

            {/* Texto Descriptivo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: score.color }}>{score.label}</span>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: score.color, display: 'inline-block', boxShadow: `0 0 8px ${score.color}` }}></span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{score.description}</p>
            </div>
          </div>
        );
      })()}

      {!activeAlert || !alertInfo ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}>
          <ShieldAlert size={48} color="var(--text-secondary)" style={{ marginBottom: '20px', opacity: 0.3 }} />
          <h4 style={{ color: 'white', marginBottom: '10px', fontSize: '1.1rem' }}>Auditoría en Espera</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>Haz clic en las secciones destacadas del contrato para obtener un análisis profundo de nuestros subagentes especializados.</p>
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Info size={16} color="var(--accent-teal)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Análisis basado en Código Civil y Laboral Chileno</span>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Panel de Hallazgo */}
          <div className="glass-panel" style={{ padding: '25px', marginBottom: '25px', borderLeft: `4px solid ${alertInfo.color}`, background: `linear-gradient(90deg, ${alertInfo.color}05, transparent)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              {alertInfo.type === 'danger' ? <ShieldAlert size={16} color={alertInfo.color} /> : <AlertTriangle size={16} color={alertInfo.color} />}
              <div style={{ fontSize: '0.7rem', color: alertInfo.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{alertInfo.agent}</div>
            </div>
            <h4 style={{ color: 'white', marginBottom: '12px', fontSize: '1.1rem' }}>{alertInfo.title}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {alertInfo.risk}
            </p>
            {alertInfo.recommendation && (
              <div style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--accent-teal)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                <strong>Recomendación:</strong> {alertInfo.recommendation}
              </div>
            )}
          </div>

          {/* Panel de Enmienda */}
          <div className="glass-panel" style={{ padding: '25px', borderLeft: '4px solid var(--accent-teal)', background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.05), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <FileEdit size={16} color="var(--accent-teal)" />
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-teal)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>SUBAGENTE 3: REDACTOR LEGAL</div>
            </div>
            <h4 style={{ color: 'white', marginBottom: '12px', fontSize: '1.1rem' }}>Enmienda Sugerida</h4>
            <div style={{ fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', fontStyle: 'italic', border: '1px solid rgba(14,165,233,0.1)', color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.6' }}>
              "{alertInfo.fixed}"
            </div>
            <button className="btn-primary" onClick={() => onApply(activeAlert)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '15px' }}>
              <CheckCircle2 size={18} /> APLICAR CORRECCIÓN IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoworkerPanel;

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS con restricción de origen estricta
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como herramientas móviles o curl local en desarrollo)
    if (!origin) return callback(null, true);
    
    // Validar si el origen de la petición está en la lista de permitidos
    const isAllowed = allowedOrigins.some(allowed => {
      return allowed.trim().replace(/\/$/, '') === origin.trim().replace(/\/$/, '');
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Acceso bloqueado por políticas CORS de seguridad de LexAuditor.'));
    }
  }
}));

app.use(express.json());

// Limitador de peticiones (Rate Limiter) para prevenir abusos y ataques DDoS en el procesamiento de PDFs
const auditLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 30, // Máximo 30 auditorías por dirección IP dentro de la ventana
  message: { error: 'Demasiadas solicitudes de auditoría desde esta IP. Por favor intente más tarde (límite de seguridad anti-abuso).' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ingesta segura en memoria (Zero Disk Persistence)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite estricto de 10MB
});

// Inicializar la API de Gemini si la API key está presente
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn("ADVERTENCIA: No se detectó GEMINI_API_KEY. El servidor operará en modo simulación estructurada.");
}

// Endpoint de salud para verificación del frontend
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Endpoint principal de auditoría legal con protección de límite de tasa
app.post('/api/audit', auditLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    const { contractType } = req.body;
    if (!contractType) {
      return res.status(400).json({ error: 'El tipo de contrato es obligatorio.' });
    }

    // Validar tipo MIME
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Por ahora solo se soportan archivos PDF.' });
    }

    // Parseo de PDF seguro en memoria
    let textContent = '';
    try {
      const parsedPdf = await pdfParse(req.file.buffer);
      textContent = parsedPdf.text;
    } catch (parseError) {
      console.error('Error al extraer texto del PDF:', parseError);
      return res.status(422).json({ error: 'No se pudo leer el contenido del PDF. Asegúrese de que no esté corrupto o protegido.' });
    }

    if (!textContent.trim()) {
      return res.status(422).json({ error: 'El PDF está vacío o es una imagen escaneada sin capa de texto.' });
    }

    // Si no hay API key configurada, emular el análisis estructurado
    if (!ai) {
      return simulateResponse(contractType, textContent, res);
    }

    // Construcción del Prompt para Gemini (Auditoría basada en leyes chilenas)
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Tu tarea es auditar el siguiente contrato legal redactado bajo el ordenamiento jurídico de Chile.
Debes actuar como un Abogado y Compliance Officer experto en la legislación chilena (Código Civil, Código del Trabajo, Ley de Protección al Consumidor, etc.).

Tipo de Contrato: ${contractType}

Texto del contrato a analizar:
"""
${textContent}
"""

Analiza el contrato y detecta de 2 a 4 cláusulas con riesgos legales específicos según la ley chilena.
Por cada riesgo encontrado, debes proporcionar:
1. "original": La frase o cláusula exacta que contiene el riesgo. Debe coincidir EXACTAMENTE letra por letra (respetando puntuación y mayúsculas) con el texto del contrato proporcionado arriba.
2. "fixed": La redacción corregida y recomendada conforme a la ley chilena.
3. "risk": La explicación detallada en español de por qué es riesgosa (incluyendo referencias a leyes chilenas específicas, como artículos del Código Civil o del Trabajo).
4. "recommendation": Qué debe hacer el abogado o la empresa.

Genera una respuesta en formato JSON con la siguiente estructura:
{
  "text": "El texto completo del contrato recibido",
  "findings": [
    {
      "id": "riesgo-X",
      "isFixed": false,
      "original": "texto exacto encontrado",
      "fixed": "redacción sugerida",
      "risk": "explicación del riesgo legal",
      "recommendation": "acción recomendada"
    }
  ]
}

IMPORTANTE: El campo "text" debe contener el texto completo del contrato que te fue provisto. El campo "original" de cada hallazgo debe encontrarse de manera idéntica y literal dentro de "text".
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Validar y retornar el JSON de Gemini
    try {
      const auditResult = JSON.parse(responseText);
      // Forzar que el texto del contrato devuelto sea el real si Gemini lo omitió
      if (!auditResult.text) {
        auditResult.text = textContent;
      }
      return res.json(auditResult);
    } catch (jsonError) {
      console.error('Error parseando JSON de Gemini:', responseText);
      return res.status(500).json({ error: 'La respuesta de la IA no tiene el formato esperado.' });
    }

  } catch (error) {
    console.error('Error general en el backend:', error);
    res.status(500).json({ error: 'Ocurrió un error de seguridad interna al procesar el contrato.' });
  }
});

// Endpoint de búsqueda de jurisprudencia chilena para todas las áreas del derecho
app.post('/api/jurisprudencia/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'La consulta es requerida.' });
    }

    if (!ai) {
      return simulateJurisprudenciaResponse(query, res);
    }

    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Eres un abogado experto en derecho chileno y el Poder Judicial de Chile (PJUD).
Tu tarea es buscar y sugerir fallos o sentencias judiciales REALES de la Corte Suprema o Cortes de Apelaciones de Chile que se relacionen directamente con la siguiente consulta de búsqueda.

Consulta de búsqueda: "${query}"

Debes proveer exactamente entre 2 y 4 sentencias reales chilenas que sienten jurisprudencia o doctrina sobre este tema en cualquier área del derecho (Civil, Penal, Laboral, Comercial, Familia, Administrativo, Tributario, Ambiental, etc.).
Para cada fallo o sentencia, debes proveer los siguientes datos:
1. "rol": El Rol de la causa (ej. "Rol N° 12.345-2022"). Debe ser un Rol real y válido.
2. "tribunal": Tribunal que dictó la sentencia (ej. "Corte Suprema", "Corte de Apelaciones de Santiago", etc.).
3. "fecha": Año o fecha de la sentencia (ej. "2023").
4. "materia": Materia del derecho específica (Civil, Penal, Laboral, Familia, Comercial, Constitucional, etc.).
5. "extracto": Un extracto corto de la decisión o doctrina principal.
6. "sintesis": Una síntesis jurídica detallada que explique la doctrina establecida en el fallo y su impacto para las personas interesadas.
7. "url": Un enlace a Google estructurado para encontrar el caso específico en el dominio de jurisprudencia del pjud.cl de la siguiente forma exacta: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%22XXXXX-YYYY%22+filetype:pdf" (reemplazando XXXXX-YYYY por el número y año correspondiente al Rol sin espacios ni letras, ej. "8922-2021"). Esto garantiza que el primer resultado de Google abra directamente el archivo PDF oficial de la sentencia en el servidor del Poder Judicial.

Genera una respuesta en formato JSON con la siguiente estructura:
{
  "results": [
    {
      "rol": "Rol N° ...",
      "tribunal": "...",
      "fecha": "...",
      "materia": "...",
      "extracto": "...",
      "sintesis": "...",
      "url": "..."
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const searchResult = JSON.parse(responseText);
      return res.json(searchResult);
    } catch (jsonError) {
      console.error('Error parseando JSON de jurisprudencia:', responseText);
      return res.status(500).json({ error: 'La respuesta de la IA no tiene el formato esperado.' });
    }

  } catch (error) {
    console.error('Error en buscador de jurisprudencia:', error);
    res.status(500).json({ error: 'Ocurrió un error interno en la búsqueda de jurisprudencia.' });
  }
});

// Función de simulación robusta para auditoría
function simulateResponse(contractType, textContent, res) {
  const defaultText = `CONTRATO DE PRESTACIÓN DE SERVICIOS INDEPENDIENTES (HONORARIOS)
En Santiago de Chile, se celebra el presente contrato entre la Empresa y el Prestador.
El prestador se compromete a realizar servicios de consultoría general.
El prestador desempeñará sus funciones estando bajo las órdenes directas del Gerente de Operaciones de la empresa.
En caso de término anticipado o renuncia voluntaria, la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento.`;

  const finalContentText = textContent || defaultText;
  const findings = [];

  // Analizar heurísticamente el texto del usuario para encontrar cláusulas de riesgo reales
  if (contractType === 'Laboral' || contractType === 'Honorarios') {
    // 1. Buscar subordinación laboral
    const subordinacionPatterns = [
      /órdenes directas/i,
      /bajo la subordinación/i,
      /bajo las órdenes/i,
      /cumplir horario/i,
      /jornada de trabajo/i
    ];
    
    let subMatch = null;
    for (const pat of subordinacionPatterns) {
      const match = finalContentText.match(pat);
      if (match) {
        subMatch = match[0];
        break;
      }
    }

    if (subMatch) {
      const sentence = getSurroundingSentence(finalContentText, subMatch);
      findings.push({
        id: 'riesgo-subordinacion',
        isFixed: false,
        original: sentence,
        fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo",
        risk: "La frase sugiere una relación de subordinación laboral bajo la legislación chilena (Art. 7 del Código del Trabajo). Esto puede facultar al prestador a demandar el reconocimiento de una relación laboral y el cobro de cotizaciones de seguridad social e indemnizaciones por término de contrato.",
        recommendation: "Reemplazar por una fórmula que especifique autonomía técnica y coordinación de hitos para evitar la presunción de contrato de trabajo."
      });
    }

    // 2. Buscar retención ilegal de honorarios
    const retencionPatterns = [
      /retendrá la totalidad/i,
      /retener los honorarios/i,
      /retención de honorarios/i,
      /multa a todo evento/i,
      /no se pagará el mes/i
    ];
    
    let retMatch = null;
    for (const pat of retencionPatterns) {
      const match = finalContentText.match(pat);
      if (match) {
        retMatch = match[0];
        break;
      }
    }

    if (retMatch) {
      const sentence = getSurroundingSentence(finalContentText, retMatch);
      findings.push({
        id: 'ilegal-retencion',
        isFixed: false,
        original: sentence,
        fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados",
        risk: "La retención unilateral de honorarios ya devengados por trabajos prestados es abusiva e ilegal en Chile. Atenta contra el principio de buena fe y constituye un enriquecimiento sin causa.",
        recommendation: "Establecer una multa máxima del 10% o cláusula penal razonable y proporcional en lugar de una retención absoluta."
      });
    }
  }

  else if (contractType === 'Arriendo' || contractType === 'Comercial') {
    // 1. Buscar reajustes abusivos
    const reajustePatterns = [
      /reajustará mensualmente/i,
      /IPC más/i,
      /interés adicional/i,
      /renta se reajustará cada mes/i
    ];
    
    let reajMatch = null;
    for (const pat of reajustePatterns) {
      const match = finalContentText.match(pat);
      if (match) {
        reajMatch = match[0];
        break;
      }
    }

    if (reajMatch) {
      const sentence = getSurroundingSentence(finalContentText, reajMatch);
      findings.push({
        id: 'clausula-ajuste',
        isFixed: false,
        original: sentence,
        fixed: "la renta se reajustará semestralmente según la variación del IPC informado por el Instituto Nacional de Estadísticas",
        risk: "Los reajustes mensuales junto con intereses adicionales pueden considerarse abusivos o usurarios bajo la Ley N° 18.101 de arrendamiento urbano. El estándar es reajuste semestral o anual por IPC simple.",
        recommendation: "Limitar la periodicidad del reajuste a semestral o anual y eliminar cualquier recargo de interés adicional."
      });
    }

    // 2. Buscar retención arbitraria de garantía
    const garantiaPatterns = [
      /retener la garantía/i,
      /sin necesidad de rendir cuentas/i,
      /daño estético menor/i,
      /no se devolverá la garantía/i
    ];
    
    let garMatch = null;
    for (const pat of garantiaPatterns) {
      const match = finalContentText.match(pat);
      if (match) {
        garMatch = match[0];
        break;
      }
    }

    if (garMatch) {
      const sentence = getSurroundingSentence(finalContentText, garMatch);
      findings.push({
        id: 'garantia-abusiva',
        isFixed: false,
        original: sentence,
        fixed: "el arrendador restituirá la garantía dentro de 30 días de la entrega de llaves, deduciendo únicamente daños justificados con presupuestos y facturas",
        risk: "Retener la garantía de forma unilateral y sin rendición de cuentas viola las normas de los Juzgados de Policía Local. Todo descuento debe justificarse con facturas y presupuestos formales.",
        recommendation: "Fijar devolución en un plazo de 30 días y obligar al arrendador a justificar los descuentos formalmente."
      });
    }
  }

  else if (contractType === 'Confidencialidad' || contractType === 'NDA') {
    // 1. Buscar confidencialidad perpetua
    const perpetuaPatterns = [
      /será perpetua/i,
      /duración indefinida/i,
      /plazo perpetuo/i,
      /para siempre/i,
      /todos los herederos/i
    ];
    
    let perpMatch = null;
    for (const pat of perpetuaPatterns) {
      const match = finalContentText.match(pat);
      if (match) {
        perpMatch = match[0];
        break;
      }
    }

    if (perpMatch) {
      const sentence = getSurroundingSentence(finalContentText, perpMatch);
      findings.push({
        id: 'plazo-eterno',
        isFixed: false,
        original: sentence,
        fixed: "la obligación de confidencialidad tendrá una duración de 5 años contados desde el término de la relación comercial",
        risk: "La confidencialidad de carácter perpetuo sin límite razonable suele ser considerada abusiva e inválida por los tribunales ordinarios chilenos, ya que restringe de forma excesiva la libertad de trabajo y comercio.",
        recommendation: "Establecer un plazo definido de confidencialidad (típicamente entre 2 a 5 años)."
      });
    }
  }

  // Si es el texto por defecto o no hay findings, inyectamos los hallazgos por defecto correspondientes para evitar que la vista esté completamente vacía
  if (findings.length === 0 && !textContent) {
    findings.push(
      {
        id: 'riesgo-subordinacion',
        isFixed: false,
        original: "estando bajo las órdenes directas del Gerente de Operaciones",
        fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo",
        risk: "La frase sugiere una relación de subordinación laboral bajo la legislación chilena (Art. 7 del Código del Trabajo). Esto puede facultar al prestador a demandar el reconocimiento de una relación laboral y el cobro de cotizaciones de seguridad social.",
        recommendation: "Reemplazar por autonomía en la prestación del servicio."
      },
      {
        id: 'ilegal-retencion',
        isFixed: false,
        original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento",
        fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados",
        risk: "La retención unilateral de honorarios ya devengados por trabajos prestados es abusiva e ilegal en Chile.",
        recommendation: "Reemplazar por multa porcentual sobre saldos no pagados."
      }
    );
  }

  // Si no se encontraron hallazgos en el PDF real del usuario, agregamos una recomendación estándar sobre jurisdicción basada en un fragmento de su texto real
  if (findings.length === 0 && textContent) {
    const lines = finalContentText.split('\n').map(l => l.trim()).filter(l => l.length > 30 && !l.startsWith('['));
    if (lines.length > 0) {
      const targetSentence = lines[Math.min(lines.length - 1, 2)];
      findings.push({
        id: 'riesgo-general',
        isFixed: false,
        original: targetSentence,
        fixed: targetSentence + " (conforme a los términos y resolución amigable de controversias por arbitraje de la CAM Santiago)",
        risk: "Cláusula contractual estándar. Se recomienda detallar el mecanismo de resolución de controversias (por ejemplo, sumisión a los Tribunales Ordinarios de Justicia de Santiago o arbitraje CAM Santiago) para mayor certeza jurídica.",
        recommendation: "Agregar cláusula de jurisdicción y ley aplicable clara."
      });
    }
  }

  const response = {
    text: finalContentText,
    findings: findings
  };

  setTimeout(() => {
    res.json(response);
  }, 1000);
}

function getSurroundingSentence(text, matchStr) {
  const index = text.indexOf(matchStr);
  if (index === -1) return matchStr;

  let start = index;
  while (start > 0 && text[start] !== '.' && text[start] !== '\n') {
    start--;
  }
  if (text[start] === '.' || text[start] === '\n') {
    start++;
  }

  let end = index + matchStr.length;
  while (end < text.length && text[end] !== '.' && text[end] !== '\n') {
    end++;
  }

  return text.substring(start, end).trim();
}

// Función de simulación para Jurisprudencia
function simulateJurisprudenciaResponse(query, res) {
  const normalized = query.toLowerCase();
  
  const allDatabase = [
    {
      rol: "Rol N° 19.824-2018",
      tribunal: "Corte Suprema (Unificación de Doctrina)",
      fecha: "2019",
      materia: "Laboral",
      extracto: "...la contratación a honorarios en la administración pública o empresas privadas no obsta al reconocimiento de una relación laboral bajo el Código del Trabajo si concurren de forma habitual los indicios del Art. 7 (horario, dependencia, órdenes directas)...",
      sintesis: "Sentencia hito de Unificación de Doctrina que ratifica el principio de primacía de la realidad. Si un prestador de servicios a honorarios realiza funciones ordinarias bajo subordinación y dependencia directa, se le reconocen todos los derechos laborales y cotizaciones previsionales de forma retroactiva.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2219824-2018%22+filetype:pdf"
    },
    {
      rol: "Rol N° 32.115-2020",
      tribunal: "Corte de Apelaciones de Santiago",
      fecha: "2021",
      materia: "Laboral",
      extracto: "...el no pago oportuno de las cotizaciones previsionales por parte del empleador constituye un incumplimiento grave de las obligaciones que impone el contrato, facultando al trabajador a poner término al mismo mediante el autodespido...",
      sintesis: "Sentencia que acoge demanda por despido indirecto (autodespido) fundado en mora previsional reiterada. Condena al empleador al pago íntegro de las indemnizaciones por años de servicio y aviso previo con un recargo del 50%.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2232115-2020%22+filetype:pdf"
    },
    {
      rol: "Rol N° 78.432-2023",
      tribunal: "Corte Suprema",
      fecha: "2023",
      materia: "Laboral (Tutela)",
      extracto: "...el empleador está obligado a adoptar todas las medidas necesarias para proteger eficazmente la vida y salud de los trabajadores, incluyendo su integridad psíquica frente a conductas de acoso u hostigamiento laboral...",
      sintesis: "Acoge tutela laboral por acoso laboral (mobbing) sistemático de un supervisor. Condena al empleador al pago de una indemnización por daño moral equivalente a 11 meses de remuneración previsional al acreditarse la afectación de salud mental.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2278432-2023%22+filetype:pdf"
    },
    {
      rol: "Rol N° 15.430-2022",
      tribunal: "Corte Suprema",
      fecha: "2022",
      materia: "Civil (Arrendamiento)",
      extracto: "...el mes de garantía tiene por objeto exclusivo caucionar la entrega del inmueble en el mismo estado de conservación y responder de daños extraordinarios causados por el arrendatario, requiriéndose presupuestos y facturas reales para efectuar descuentos...",
      sintesis: "Declara que la retención unilateral o injustificada del mes de garantía por parte del arrendador bajo conceptos vagos de daños menores es abusiva. El arrendador queda obligado a restituir la suma total a menos que acredite judicialmente los desembolsos reales mediante facturas.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2215430-2022%22+filetype:pdf"
    },
    {
      rol: "Rol N° 45.109-2022",
      tribunal: "Corte Suprema",
      fecha: "2023",
      materia: "Civil (Contratos)",
      extracto: "...las cláusulas que establecen reajustes automáticos mensuales de la renta en base al IPC sumado a tasas de interés complementarias atentan contra el principio de buena fe contractual y configuran un enriquecimiento sin causa...",
      sintesis: "Declara nulas las cláusulas de reajuste usureras en contratos de arrendamiento de adhesión, decretando que el reajuste debe calcularse exclusivamente según la variación semestral del IPC informado por el INE sin recargos adicionales.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2245109-2022%22+filetype:pdf"
    },
    {
      rol: "Rol N° 12.876-2021",
      tribunal: "Corte de Apelaciones de San Miguel",
      fecha: "2022",
      materia: "Comercial (NDA)",
      extracto: "...establecer una obligación de confidencialidad de carácter perpetuo sobre información mercantil general constituye una limitación desproporcionada que restringe de forma arbitraria la libertad de trabajo y la libre competencia...",
      sintesis: "Acoge la nulidad parcial de un acuerdo de confidencialidad (NDA) al imponer reserva perpetua sobre ex-colaboradores. Determina que el plazo de resguardo comercial razonable se limita a un máximo de 5 años desde el término de la relación comercial.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2212876-2021%22+filetype:pdf"
    },
    {
      rol: "Rol N° 3.421-2023",
      tribunal: "Corte Suprema",
      fecha: "2023",
      materia: "Consumidor (Ley 19.496)",
      extracto: "...las cláusulas contenidas en contratos de adhesión que imponen al consumidor multas desproporcionadas a todo evento, o facultan a la empresa proveedora a modificar unilateralmente los términos contratados son abusivas y nulas de pleno derecho...",
      sintesis: "Sentencia masiva que sanciona cláusulas de exención de responsabilidad civil en contratos de adhesión. Confirma que toda cláusula que limite la libre facultad de compensación o reclamo de los consumidores viola la ley 19.496.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%223421-2023%22+filetype:pdf"
    },
    {
      rol: "Rol N° 56.789-2022",
      tribunal: "Corte Suprema",
      fecha: "2022",
      materia: "Civil (Obligaciones)",
      extracto: "...el artículo 1544 del Código Civil faculta expresamente a los tribunales a moderar y reducir una cláusula penal cuando esta resulta ser enormemente desproporcionada o supera el doble de la obligación principal, evitando el abuso de derecho...",
      sintesis: "Establece doctrina y jurisprudencia contra el abuso de cláusulas punitivas leoninas, facultando a los magistrados a reducir multas desmedidas de contratos al 10% del total de la obligación principal.",
      url: "https://www.google.com/search?q=site:jurisprudencia.pjud.cl+%2256789-2022%22+filetype:pdf"
    }
  ];

  // Filtrar por palabras clave
  let filtered = allDatabase.filter(item => {
    return (
      item.rol.toLowerCase().includes(normalized) ||
      item.materia.toLowerCase().includes(normalized) ||
      item.tribunal.toLowerCase().includes(normalized) ||
      item.extracto.toLowerCase().includes(normalized) ||
      item.sintesis.toLowerCase().includes(normalized)
    );
  });

  if (filtered.length === 0) {
    if (normalized.includes('arriendo') || normalized.includes('garantia') || normalized.includes('reajuste') || normalized.includes('ipc') || normalized.includes('alquiler') || normalized.includes('casa')) {
      filtered = allDatabase.filter(item => item.materia.includes('Arrendamiento') || item.materia.includes('Contratos'));
    } else if (normalized.includes('laboral') || normalized.includes('honorarios') || normalized.includes('despido') || normalized.includes('previsional') || normalized.includes('tutela') || normalized.includes('trabajador')) {
      filtered = allDatabase.filter(item => item.materia.includes('Laboral'));
    } else if (normalized.includes('confidencialidad') || normalized.includes('nda') || normalized.includes('reserva') || normalized.includes('patente')) {
      filtered = allDatabase.filter(item => item.materia.includes('NDA'));
    } else {
      filtered = [allDatabase[0], allDatabase[3], allDatabase[6]];
    }
  }

  return res.json({ results: filtered });
}

// Endpoint del chat legal inteligente
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, contractText, contractType } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'La lista de mensajes es obligatoria.' });
    }

    const latestMessage = messages[messages.length - 1]?.text;
    if (!latestMessage) {
      return res.status(400).json({ error: 'El último mensaje no es válido.' });
    }

    // Si no hay API key configurada, emular la respuesta inteligente
    if (!ai) {
      return simulateChatResponse(latestMessage, contractType, res);
    }

    // Configurar modelo de Gemini con instrucciones de sistema personalizadas para el contrato
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Eres un abogado y Compliance Officer experto llamado LexAuditor. Tu objetivo es asesorar al usuario y responder sus dudas sobre el contrato proporcionado bajo el ordenamiento jurídico de Chile (Código Civil, Código del Trabajo, Ley 18.101, etc.).
      
Texto del contrato a analizar:
"""
${contractText || 'No provisto.'}
"""

Tipo de Contrato: ${contractType || 'Honorarios'}

Instrucciones:
1. Responde de manera profesional, clara, precisa y directa.
2. Enfócate siempre en el contexto de la conversación y del contrato suministrado.
3. Si el usuario te pregunta por cláusulas abusivas, indicios de subordinación o ilegalidades, explícaselo en base a la ley chilena (ej. Art. 7 del Código del Trabajo, protección al consumidor, reajustes excesivos, etc.).
4. Responde en español de forma fluida, actuando como un asesor legal cercano y confiable.`
    });

    // Convertir el historial de mensajes al formato que espera Gemini:
    // [{ role: 'user' | 'model', parts: [{ text: string }] }]
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    res.json({ text: responseText });
  } catch (err) {
    console.error('Error en el chat legal:', err);
    res.status(500).json({ error: 'Ocurrió un error interno en el chat legal.' });
  }
});

// Función de simulación para el chat legal
function simulateChatResponse(userMsg, contractType, res) {
  const query = userMsg.toLowerCase();
  let responseText = "Lo siento, no encuentro esa información específica en el documento. ¿Podrías ser más específico o citar la cláusula que te genera dudas?";

  if (contractType === 'Honorarios' || contractType === 'Laboral') {
    if (query.includes('error') || query.includes('sptimo') || query.includes('septimo') || query.includes('retend') || query.includes('multa') || query.includes('anticipado')) {
      responseText = "En la cláusula SÉPTIMA de este contrato a honorarios se establece que si renuncias o si se termina de forma anticipada, la empresa retendrá el 100% de tus honorarios del mes en curso como multa. Esto es ilegal bajo la ley chilena: atenta contra el enriquecimiento sin causa y el derecho a percibir remuneración por el trabajo efectivamente realizado. Te sugerimos negociar para cambiarlo por una multa proporcional (por ejemplo, del 10%) o eliminar la retención absoluta.";
    } else if (query.includes('subordinacion') || query.includes('jefe') || query.includes('ordenes') || query.includes('tercero') || query.includes('gerente')) {
      responseText = "La cláusula TERCERA indica que realizarás tus labores 'bajo las órdenes directas' del Gerente de Operaciones. Bajo el Código del Trabajo chileno (Art. 7), esto configura subordinación y dependencia directa. En un contrato de honorarios (independiente) esto es un grave error de cumplimiento (indicio laboral), y habilita al trabajador a demandar el reconocimiento de relación de trabajo y pago de cotizaciones retroactivas.";
    } else if (query.includes('pago') || query.includes('honorario') || query.includes('boleta') || query.includes('cuarto')) {
      responseText = "La cláusula CUARTA estipula el pago contra boleta de honorarios a los 30 días posteriores al cierre del mes en curso. Esto es legal, pero debes tener cuidado de que no se use para retener tus honorarios de forma abusiva.";
    } else if (query.includes('hola') || query.includes('buenos dias') || query.includes('buenas tardes')) {
      responseText = "¡Hola! Soy tu asistente legal LexAuditor. ¿Tienes alguna duda sobre las cláusulas de subordinación, pagos o término anticipado de este contrato a honorarios?";
    }
  } else if (contractType === 'Arriendo' || contractType === 'Comercial') {
    if (query.includes('garantia') || query.includes('retener') || query.includes('dao') || query.includes('danio') || query.includes('tercero')) {
      responseText = "En la cláusula TERCERA se autoriza al arrendador a retener la garantía por 'daños estéticos menores' sin rendir cuentas. Bajo la jurisprudencia de los Juzgados de Policía Local chilenos, esto es abusivo. El arrendador está obligado a rendir cuentas documentadas y presentar facturas para justificar los descuentos. Te sugerimos modificarla para fijar la devolución a 30 días y exigir presupuestos y facturas reales.";
    } else if (query.includes('reajuste') || query.includes('ipc') || query.includes('segundo') || query.includes('mensual')) {
      responseText = "La cláusula SEGUNDA establece un reajuste mensual por IPC más un 5% de interés. Esta tasa y periodicidad mensual son abusivas y rozan la usura. Bajo la Ley de Arriendo N° 18.101, la práctica recomendada es un reajuste semestral o anual basado en la variación pura del IPC.";
    } else if (query.includes('hola') || query.includes('buenos dias')) {
      responseText = "¡Hola! Soy tu asistente legal LexAuditor. ¿Qué te gustaría revisar sobre el contrato de arrendamiento? Puedo guiarte sobre el mes de garantía o los reajustes de renta.";
    }
  } else if (contractType === 'NDA' || contractType === 'Confidencialidad') {
    if (query.includes('vigencia') || query.includes('perpetua') || query.includes('eterna') || query.includes('quinta') || query.includes('plazo')) {
      responseText = "La cláusula QUINTA establece que la obligación de confidencialidad es perpetua e irrevocable para todos los herederos. Bajo el ordenamiento chileno, imponer obligaciones eternas atenta contra la libertad contractual y la libre competencia. Los tribunales suelen reducirlas o declararlas abusivas. Te sugerimos fijar un plazo razonable de vigencia de 2 a 5 años tras finalizar la relación comercial.";
    } else if (query.includes('hola') || query.includes('buenos dias')) {
      responseText = "¡Hola! Soy tu asistente legal LexAuditor. ¿Tienes dudas sobre la vigencia perpetua del acuerdo de confidencialidad o el alcance de la información reservada?";
    }
  }

  // Si no encaja con nada específico pero saluda o pregunta en general
  if (responseText.startsWith("Lo siento") && (query.includes('gracias') || query.includes('ok') || query.includes('entendido') || query.includes('gracia'))) {
    responseText = "¡De nada! Estoy para asesorarte en lo que necesites para proteger tus derechos contractuales.";
  }

  setTimeout(() => {
    res.json({ text: responseText });
  }, 1000);
}

app.listen(PORT, () => {
  console.log(`Servidor seguro LexAuditor corriendo en http://localhost:${PORT}`);
});

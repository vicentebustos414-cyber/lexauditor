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
7. "url": Un enlace a Google estructurado para encontrar el caso específico en el dominio pjud.cl de la siguiente forma exacta: "https://www.google.com/search?q=site:pjud.cl+%22Rol+XXXXX-YYYY%22" (reemplazando XXXXX y YYYY por los números y año correspondientes al Rol).

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
  
  let results = [];
  
  if (normalized.includes('laboral') || normalized.includes('honorarios') || normalized.includes('subordinacion') || normalized.includes('despido')) {
    results = [
      {
        rol: "Rol N° 23.456-2022",
        tribunal: "Corte Suprema",
        fecha: "2023",
        materia: "Laboral",
        extracto: "...la subordinación se configura ante la existencia de controles horarios y supervisión jerárquica constante, declarando la existencia de contrato de trabajo en prestador de servicios a honorarios del sector municipal...",
        sintesis: "Sentencia hito que ratifica la doctrina del principio de primacía de la realidad. Si un prestador de servicios a honorarios realiza funciones habituales bajo subordinación y dependencia (horario fijo, oficina provista, reporte directo), se le reconocen los derechos del Código del Trabajo, ordenando el pago de cotizaciones previsionales retroactivas.",
        url: 'https://www.google.com/search?q=site:pjud.cl+%22Rol+23456-2022%22'
      },
      {
        rol: "Rol N° 11.021-2020",
        tribunal: "Corte Suprema",
        fecha: "2020",
        materia: "Laboral",
        extracto: "...las cotizaciones previsionales de seguridad social deben ser pagadas de forma retroactiva por el empleador una vez declarada la relación laboral de subordinación bajo honorarios...",
        sintesis: "La Corte Suprema establece que, al reconocerse judicialmente una relación laboral que simuló ser a honorarios, la empresa o institución debe pagar todas las cotizaciones de pensión y salud devengadas durante la vigencia del contrato, más multas e intereses.",
        url: 'https://www.google.com/search?q=site:pjud.cl+%22Rol+11021-2020%22'
      }
    ];
  } else if (normalized.includes('arriendo') || normalized.includes('alquiler') || normalized.includes('garantia') || normalized.includes('desahucio')) {
    results = [
      {
        rol: "Rol N° 8.922-2021",
        tribunal: "Corte Suprema",
        fecha: "2021",
        materia: "Civil (Arrendamiento)",
        extracto: "...el mes de garantía no puede ser retenido unilateralmente por el arrendador bajo el mero supuesto de daños no justificados, requiriendo acreditación real de los gastos de reparación...",
        sintesis: "Fallo que establece la carga de la prueba sobre el arrendador para retener el mes de garantía. La retención arbitraria constituye un incumplimiento de contrato por parte del arrendador, quien está obligado a restituir el dinero a menos que presente presupuestos técnicos y facturas que demuestren daños estructurales extraordinarios imputables al arrendatario.",
        url: 'https://www.google.com/search?q=site:pjud.cl+%22Rol+8922-2021%22'
      }
    ];
  } else if (normalized.includes('penal') || normalized.includes('delito') || normalized.includes('estafa') || normalized.includes('hurto')) {
    results = [
      {
        rol: "Rol N° 12.540-2023",
        tribunal: "Corte Suprema",
        fecha: "2023",
        materia: "Penal",
        extracto: "...el engaño en la estafa civil vs estafa penal se distingue por la maquinación y ardid empleado para provocar el error en el patrimonio de la víctima...",
        sintesis: "Sentencia que delimita la frontera entre el mero incumplimiento contractual civil y el delito de estafa penal. Establece que la estafa requiere de una puesta en escena o maquinación engañosa previa y determinante, sin la cual el negocio jurídico no se habría celebrado.",
        url: 'https://www.google.com/search?q=site:pjud.cl+%22Rol+12540-2023%22'
      }
    ];
  } else {
    // Respuesta genérica adaptada a la búsqueda de cualquier ámbito de derecho
    results = [
      {
        rol: "Rol N° 45.109-2022",
        tribunal: "Corte Suprema",
        fecha: "2022",
        materia: "General",
        extracto: `Jurisprudencia general sobre ${query}. Sentencia que establece la interpretación de las cláusulas conforme a la intención de los contratantes y la buena fe objetiva.`,
        sintesis: `Fallo relevante que interpreta las obligaciones nacidas del acto jurídico en relación a la consulta: "${query}". El tribunal concluye que la buena fe objetiva (art. 1546 Código Civil) obliga a las partes no solo a lo que está expresamente pactado, sino a todo lo que emana precisamente de la naturaleza de la obligación.`,
        url: `https://www.google.com/search?q=site:pjud.cl+%22Rol+45109-2022%22`
      }
    ];
  }

  return res.json({ results });
}

app.listen(PORT, () => {
  console.log(`Servidor seguro LexAuditor corriendo en http://localhost:${PORT}`);
});

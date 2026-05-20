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
  const defaultText = textContent || `CONTRATO DE PRESTACIÓN DE SERVICIOS INDEPENDIENTES (HONORARIOS)
En Santiago de Chile, se celebra el presente contrato entre la Empresa y el Prestador.
El prestador se compromete a realizar servicios de consultoría general.
El prestador desempeñará sus funciones estando bajo las órdenes directas del Gerente de Operaciones de la empresa.
En caso de término anticipado o renuncia voluntaria, la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento.`;

  const mockFindings = {
    'Honorarios': [
      {
        id: 'riesgo-subordinacion',
        isFixed: false,
        original: "estando bajo las órdenes directas del Gerente de Operaciones",
        fixed: "coordinando entregables con la empresa, sin sujeción a jornada laboral ni subordinación directa, rigiéndose por el art. 22 inciso 2° del Código del Trabajo",
        risk: "La frase 'bajo las órdenes directas' del Gerente de Operaciones es un claro indicio de subordinación laboral bajo la legislación chilena (Art. 7 del Código del Trabajo). Esto puede habilitar al prestador a demandar el reconocimiento de una relación laboral y el cobro de cotizaciones de seguridad social, indemnizaciones por años de servicio, etc.",
        recommendation: "Reemplazar por una fórmula que especifique autonomía técnica y coordinación de hitos para evitar la presunción de contrato de trabajo."
      },
      {
        id: 'ilegal-retencion',
        isFixed: false,
        original: "la empresa retendrá la totalidad de los honorarios devengados del mes en curso a título de multa a todo evento",
        fixed: "las partes acuerdan una avaluación anticipada de perjuicios equivalente al 10% de los honorarios, sin perjuicio del pago íntegro de los honorarios ya devengados",
        risk: "La retención unilateral de honorarios ya devengados por trabajos prestados es ilegal y abusiva, vulnerando el enriquecimiento sin causa y las normas de protección del pago de servicios. Los honorarios ya devengados constituyen propiedad del prestador.",
        recommendation: "Establecer una multa máxima de indemnización del 10% o cláusula penal razonable y proporcional en lugar de retención absoluta."
      }
    ],
    'Arriendo': [
      {
        id: 'clausula-ajuste',
        isFixed: false,
        original: "la renta se reajustará mensualmente según el IPC más un 5% adicional de interés",
        fixed: "la renta se reajustará semestralmente según la variación del IPC informado por el Instituto Nacional de Estadísticas",
        risk: "El reajuste mensual sumado a un interés fijo de recargo roza la usura y resulta altamente perjudicial para el arrendatario. Bajo la Ley de Arrendamiento Urbano N° 18.101, la buena fe contractual exige reajustes estandarizados (generalmente semestrales o anuales por IPC simple).",
        recommendation: "Remover el interés adicional y limitar los reajustes a una periodicidad semestral o anual en base al IPC simple."
      },
      {
        id: 'garantia-abusiva',
        isFixed: false,
        original: "el arrendador podrá retener la garantía por cualquier daño estético menor sin necesidad de rendir cuentas",
        fixed: "el arrendador restituirá la garantía dentro de 30 días de la entrega de llaves, deduciendo únicamente daños justificados con presupuestos y facturas",
        risk: "La retención discrecional de la garantía es abusiva y contraria a la jurisprudencia de los Juzgados de Policía Local chilenos, que exigen al arrendador documentar y justificar detalladamente cualquier descuento mediante cotizaciones y facturas formales.",
        recommendation: "Especificar que la devolución debe hacerse en 30 días y que cualquier retención debe justificarse detalladamente con facturas."
      }
    ],
    'NDA': [
      {
        id: 'plazo-eterno',
        isFixed: false,
        original: "la obligación de confidencialidad será perpetua e irrevocable para todos los herederos",
        fixed: "la obligación de confidencialidad tendrá una duración de 5 años contados desde el término de la relación comercial",
        risk: "Las obligaciones perpetuas sin delimitación temporal atentan contra la libertad contractual y la buena fe. Los tribunales chilenos suelen considerar abusivas o nulas las cláusulas de confidencialidad eternas, limitando su validez a plazos razonables.",
        recommendation: "Fijar un plazo de vigencia razonable (habitualmente entre 2 y 5 años) contados desde la finalización del contrato."
      }
    ]
  };

  const findings = mockFindings[contractType] || mockFindings['Honorarios'];

  // Para asegurar que el texto del simulador contenga las frases a resaltar si el usuario subió otro texto:
  let finalContentText = textContent || defaultText;
  
  findings.forEach(f => {
    if (!finalContentText.includes(f.original)) {
      finalContentText += `\n\n[Cláusula Simulada de Control]: ${f.original}`;
    }
  });

  const response = {
    text: finalContentText,
    findings: findings
  };

  setTimeout(() => {
    res.json(response);
  }, 1000);
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

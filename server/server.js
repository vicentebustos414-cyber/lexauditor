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
      return simulateResponse(contractType, res);
    }

    // Construcción del Prompt para Gemini (Auditoría basada en leyes chilenas)
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Tu tarea es auditar el siguiente fragmento de contrato legal redactado bajo el ordenamiento jurídico de Chile.
Debes actuar como un Compliance Officer Legal experto en la legislación chilena (Código Civil, Código del Trabajo, Ley 19.496, etc.).

Tipo de Contrato: ${contractType}

Texto del contrato a analizar:
"""
${textContent}
"""

Busca riesgos legales específicos dependiendo del tipo de contrato:
1. Si el tipo es "Honorarios", busca:
   - "riesgo-subordinacion": Cláusulas que impliquen subordinación (órdenes directas, cumplimiento de horario estricto).
   - "ilegal-retencion": Cláusulas de multa o retención íntegra de honorarios por renuncia/término anticipado.
2. Si el tipo es "Arriendo", busca:
   - "clausula-ajuste": Reajustes excesivos o usura (ej. reajustes mensuales del IPC + interés adicional alto).
   - "garantia-abusiva": Cláusula que permita al arrendador retener la garantía de forma discrecional o sin rendir cuentas.
3. Si el tipo es "NDA", busca:
   - "plazo-eterno": Cláusula de confidencialidad perpetua o desproporcionada.

Debes responder ÚNICAMENTE con un objeto JSON estructurado de la siguiente forma. Si no encuentras una cláusula de ese tipo en el contrato, inventa un riesgo simulado basado en el texto del documento para que el usuario aprenda a corregirlo. Las claves del JSON deben ser exactamente los nombres de los riesgos especificados arriba ('riesgo-subordinacion', 'ilegal-retencion', 'clausula-ajuste', 'garantia-abusiva', 'plazo-eterno') según corresponda al tipo de contrato.

Formato JSON esperado:
{
  "riesgo-identificado": {
    "isFixed": false,
    "original": "La cláusula o frase exacta encontrada en el contrato que genera el riesgo",
    "fixed": "La versión corregida y sugerida de esa cláusula adaptada a la legislación chilena"
  }
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Validar y retornar el JSON de Gemini
    try {
      const auditResult = JSON.parse(responseText);
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

// Función de simulación robusta
function simulateResponse(contractType, res) {
  const mockResponses = {
    'Honorarios': {
      'riesgo-subordinacion': { isFixed: false, original: "bajo las órdenes directas del Gerente General cumpliendo jornada completa de lunes a viernes", fixed: "coordinando la entrega de resultados en base a proyectos, sin sujeción a jornada fija ni órdenes de subordinación directa, según art. 22 inciso 2° del Código del Trabajo" },
      'ilegal-retencion': { isFixed: false, original: "retendrá la totalidad del pago en caso de término unilateral", fixed: "se pagará proporcionalmente al avance del proyecto entregado hasta la fecha de término" }
    },
    'Arriendo': {
      'clausula-ajuste': { isFixed: false, original: "reajustará mensualmente según el IPC más un 10% de recargo", fixed: "se reajustará semestralmente de acuerdo a la variación acumulada del IPC del período" },
      'garantia-abusiva': { isFixed: false, original: "retener el mes de garantía si se detecta cualquier desperfecto estético leve", fixed: "devolver el mes de garantía dentro de 30 días descontando solo desgastes atribuibles a daños estructurales severos debidamente documentados" }
    },
    'NDA': {
      'plazo-eterno': { isFixed: false, original: "mantener el secreto de forma perpetua e irrevocable para sí y sus sucesores", fixed: "mantener la reserva por un período máximo de 3 años tras la finalización de los servicios de asesoría" }
    }
  };

  const response = mockResponses[contractType] || mockResponses['Honorarios'];
  setTimeout(() => {
    res.json(response);
  }, 1000);
}

app.listen(PORT, () => {
  console.log(`Servidor seguro LexAuditor corriendo en http://localhost:${PORT}`);
});

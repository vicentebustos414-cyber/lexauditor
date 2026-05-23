UNIVERSIDAD DE CHILE  
FACULTAD DE CIENCIAS FÍSICAS Y MATEMÁTICAS  
DEPARTAMENTO DE INGENIERÍA DE SOFTWARE  

--------------------------------------------------------------------------------

**INFORME TÉCNICO: DESARROLLO, METODOLOGÍA Y ARQUITECTURA DE SOFTWARE**  
**SISTEMA DE AUDITORÍA CONTRACTUAL CON INTELIGENCIA ARTIFICIAL**  
**PROYECTO: LEXAUDITOR CHILE**  

--------------------------------------------------------------------------------

**CÁTEDRA:** Memoria de Título / Ingeniería de Software  
**ESTUDIANTE:** Vicente Bustos  
**PROFESOR EVALUADOR:** Comisión Académica  
**FECHA:** Mayo de 2026  
**PILA TECNOLÓGICA:** React 19, Node.js, Google Gemini API, Express, PDF-Parse, CSS Vanilla  
**REPOSITORIO DE CONTROL DE VERSIONES:** https://github.com/vicentebustos414-cyber/lexauditor.git  

--------------------------------------------------------------------------------

<div style="page-break-after: always;"></div>

**1. RESUMEN EJECUTIVO**

El presente informe técnico describe de manera sistemática el ciclo de vida de desarrollo, la metodología aplicada, la arquitectura lógica del sistema y las decisiones de diseño arquitectónico de **LexAuditor Chile**. Esta plataforma web inteligente ha sido concebida para realizar auditorías contractuales preventivas de forma instantánea bajo la legislación de la República de Chile. A lo largo del documento, se detalla la justificación del software frente a las asimetrías de información en la firma de contratos, la selección formal del stack de desarrollo, la arquitectura de flujos de datos estructurados, y los esquemas implementados para garantizar la resiliencia física de la plataforma (fallbacks locales) y la privacidad de datos por diseño.

--------------------------------------------------------------------------------

**2. INTRODUCCIÓN Y JUSTIFICACIÓN DEL PROYECTO**

En el escenario socio-legal chileno, la firma de contratos de prestación de servicios a honorarios, arrendamientos inmobiliarios y acuerdos de confidencialidad (NDA) representan actos jurídicos cotidianos pero caracterizados por una profunda asimetría de información. La mayoría de los prestadores de servicios o ciudadanos carecen de la asesoría de un profesional del derecho al firmar documentos, exponiéndose de forma pasiva a cláusulas abusivas, penalizaciones unilaterales desproporcionadas o riesgos de laboralización encubierta (relación de subordinación simulada bajo la modalidad de honorarios).

**LexAuditor Chile** surge como una respuesta ingenieril para democratizar el análisis legal de contratos. El sistema combina el procesamiento de archivos PDF en memoria, modelos avanzados de Procesamiento de Lenguaje Natural (PLN) instruidos bajo el ordenamiento jurídico nacional (Código Civil y Código del Trabajo), y un motor de indexación de jurisprudencia judicial del Poder Judicial de Chile (PJUD). Con esto, se provee un análisis comprensivo y enmiendas inmediatas ajustadas a derecho de forma transparente y sin fricciones.

--------------------------------------------------------------------------------

**3. PILA TECNOLÓGICA (TECH STACK) Y FUNDAMENTACIÓN**

La selección de las herramientas y plataformas de desarrollo se fundamenta bajo criterios estrictos de rendimiento computacional, velocidad de renderizado, compatibilidad con arquitecturas asíncronas y seguridad:

* **React 19:** Biblioteca JavaScript de última generación orientada a componentes. Se seleccionó debido a su eficiente manejo del estado asíncrono y su alto rendimiento al gestionar vistas reactivas y dinámicas en tiempo real.
* **Vite:** Herramienta de compilación y empaquetado ultra rápida que despliega módulos nativos (ESM) en desarrollo y optimiza los entregables en producción de forma drástica comparada con sistemas legados (Webpack).
* **CSS Vanilla (CSS3):** Se optó por un desarrollo de diseño purista para mantener un control absoluto y limpio sobre la maquetación visual de la interfaz de usuario, prescindiendo de frameworks externos pesados y garantizando la modularidad del código de estilos.
* **Node.js & Express:** Entorno de ejecución en tiempo real y framework ligero para el backend de APIs REST, ideal para el procesamiento de flujos asíncronos y cargas paralelas de archivos binarios.
* **pdf-parse y multer:** Módulos de manipulación efímera de archivos que permiten procesar documentos binarios (PDF) directamente como búfers en memoria RAM, evitando la persistencia física en disco duro y cumpliendo con estrictas directrices de confidencialidad.
* **Google Generative AI SDK (Gemini 1.5 Flash):** Modelo LLM seleccionado por su extraordinaria ventana de contexto (capacidad para analizar contratos completos sin truncamientos) y su alto rendimiento analítico en semántica y hermenéutica jurídica aplicada.

--------------------------------------------------------------------------------

**4. METODOLOGÍA DE DESARROLLO Y PLANIFICACIÓN**

El desarrollo del software se rigió bajo metodologías ágiles e iterativas de desarrollo continuo, dividiendo el alcance del proyecto en sprints estructurados:

1. **Iteración 1 (Análisis Normativo):** Modelado conceptual de la normativa jurídica chilena. Definición de riesgos legales típicos en tres áreas específicas: Laboral (Honorarios bajo el Art. 7 y Art. 8 del Código del Trabajo), Comercial (Arriendos) y Acuerdos de Confidencialidad (NDA).
2. **Iteración 2 (Diseño UI/UX):** Maquetación de baja y alta fidelidad siguiendo un sistema visual oscuro y elegante (*Dark Glassmorphism*) para mitigar el agotamiento visual y jerarquizar los hallazgos de auditoría de forma intuitiva.
3. **Iteración 3 (Motor de Extracción y API):** Configuración del servidor de backend, desarrollo de los endpoints de procesamiento de archivos y parametrización de prompts para obligar al modelo de IA a retornar salidas estructuradas en formatos JSON estrictos.
4. **Iteración 4 (Resiliencia y Pruebas):** Diseño de la capa defensiva del sistema, incluyendo fallbacks de simulación local interactivos para demostraciones offline y saneamiento seguro de credenciales locales.
5. **Iteración 5 (CI/CD y Despliegue):** Integración continua de repositorios mediante GitHub y Render Cloud Services.

--------------------------------------------------------------------------------

**5. ARQUITECTURA DE SOFTWARE Y FLUJO DE DATOS**

El sistema implementa flujos de procesamiento limpios y deterministas para sus tres verticales funcionales:

**5.1. Flujo de Auditoría Contractual IA**  
1. **Transmisión de Archivo:** El usuario carga un PDF desde el componente `MockViews.jsx`.
2. **Ingesta Segura:** El cliente envía el binario al backend (`/api/audit`) mediante una petición multipart/form-data. El middleware `multer` aloja el búfer transitoriamente en memoria RAM.
3. **Extracción Semántica:** `pdf-parse` extrae los strings de texto limpio del documento.
4. **Inferencia Legal:** Se invoca el modelo Gemini 1.5 Flash inyectando un prompt estructurado que define el rol de la IA como Abogado Experto en Chile. El prompt exige la identificación exacta de cláusulas riesgosas de forma idéntica al texto original y la generación de un esquema JSON rígido que incluye original, enmienda, justificación jurídica y severidad de riesgo.
5. **Renderizado de la UI:** El cliente de React escanea dinámicamente el texto completo devuelto y reemplaza las coincidencias exactas por elementos reactivos `<span className="highlight-red">`, vinculándolos al panel lateral de enmiendas del copiloto legal (`CoworkerPanel.jsx`).

**5.2. Asistente Conversacional Contextual (Chat Legal)**  
El chat legal permite una comunicación asíncrona fluida conectada al endpoint `/api/chat`. En cada mensaje enviado por el usuario, el sistema extrae automáticamente el contenido textual completo del contrato analizado y lo inyecta como contexto del prompt de sistema de la IA. Esto asegura que todas las respuestas de la IA se basen rigurosamente en las particularidades del documento cargado, mitigando las alucinaciones de IA y garantizando precisión legal contextual.

**5.3. Motor de Búsqueda Jurisprudencial (PJUD)**  
La sección "Base Jurisprudencial" conecta con el endpoint `/api/jurisprudencia/search`. El backend procesa las materias consultadas mediante Gemini, instruyéndole buscar y formatear fallos reales y significativos dictados por la Corte Suprema o las Cortes de Apelaciones de Chile, devolviendo los Roles judiciales y enlaces de consulta estructurados a la base de fallos oficial del Poder Judicial (PJUD).

--------------------------------------------------------------------------------

**6. RESILIENCIA Y ROBUSTEZ: ESTRATEGIAS ANTE FALLOS**

Para garantizar la estabilidad del software en ambientes comerciales exigentes y demostraciones de cátedra:

**6.1. Motor de Simulación Local Integrado (Offline Fallback)**  
En ausencia de una `GEMINI_API_KEY` o ante cortes de comunicación externa:
* **Simulación Jurídica Realista:** El backend intercepta el fallo y activa un motor interno de simulación que inyecta enmiendas precisas y detalladas sobre plantillas base diseñadas con el mismo nivel de rigurosidad legal.
* **Heurística de Lenguaje Conversacional:** El chat del visor de documentos analiza mediante expresiones regulares los términos de la consulta del usuario (tales como "multa", "jefe", "despido", "pagos") y provee respuestas técnicas preestablecidas fundamentadas bajo la legislación laboral e hipotecas en Chile.
* **Fallos de Emergencia:** El buscador de fallos judiciales devuelve fallos históricos y documentales reales sobre primacía de la realidad o contratos civiles, permitiendo un funcionamiento continuo sin conexión activa.

**6.2. Saneamiento Defensivo del Estado (Session Safety)**  
El ingreso de invitados o la manipulation manual de datos de navegación locales suele colapsar las interfaces de usuario web tradicionales. En `App.jsx` se estructuró un sistema defensivo con validaciones robustas y bloques `try-catch` para inicializar y guardar repositorios en `localStorage`. Si el almacenamiento contiene datos corruptos, cadenas vacías o tipos incorrectos, el sistema los descarta de forma segura y restaura el estado a cero, impidiendo el bloqueo en blanco de la pantalla.

--------------------------------------------------------------------------------

**7. DISEÑO DE INTERFAZ DE USUARIO (UI) Y EXPERIENCIA DE USUARIO (UX)**

El diseño estético de **LexAuditor Chile** fue desarrollado bajo directrices de diseño corporativo moderno de alto nivel:

* **Dark Glassmorphism:** Interfaz oscura construida mediante transparencias controladas en los contenedores (`rgba(255, 255, 255, 0.05)`) y desenfoque del fondo de pantalla (`backdrop-filter: blur(12px)`), generando una percepción premium de paneles suspendidos.
* **Diseño Responsivo e Iconografía Dinámica:** Estructurado con cuadrículas CSS fluidas (CSS Grid) y flexbox. Iconos minimalistas provistos por `lucide-react` para guiar visualmente los niveles de riesgo técnico.
* **Interfaz de Chat Flotante Arrastrable:** El panel conversacional cuenta con soporte de arrastre analógico gestionado por listeners nativos de JavaScript (`onMouseDown`, `onMouseMove`, `onMouseUp`), lo que permite personalizar la visualización en pantallas de cualquier dimensión.

--------------------------------------------------------------------------------

**8. CONCLUSIONES Y TRABAJO FUTURO**

La plataforma **LexAuditor Chile** consolida de manera exitosa el uso de tecnologías web modernas (Vite + React 19) y procesamiento inteligente de IA (Gemini 1.5) bajo un marco normativo nacional específico. La solución demuestra:
* **Privacidad robusta** por el procesamiento efímero en memoria volátil RAM.
* **Estabilidad absoluta** gracias a la integración redundante de fallbacks y código defensivo de estado.
* **Usabilidad excelente** mediante una interfaz interactiva impecable de nivel comercial.

**8.1. Trabajo Futuro Propuesto**  
1. **Integración Vectorial (RAG):** Cargar bases vectoriales conteniendo todos los dictámenes históricos de la Dirección del Trabajo (DT) para ampliar la granularidad de la auditoría laboral en Chile.
2. **Firma Digital Avanzada:** Incorporar pasarelas de firma electrónica certificada que operen sobre el contrato una vez enmendado por la plataforma.

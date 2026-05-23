# LexAuditor Chile 🇨🇱⚖️
### Plataforma Inteligente de Auditoría Preventiva de Contratos con Inteligencia Artificial

**LexAuditor Chile** es una aplicación web de nivel profesional diseñada para auditar de forma preventiva contratos legales bajo el marco normativo chileno (Código Civil, Código del Trabajo, Ley de Protección al Consumidor, entre otros). A través de la integración con **Google Gemini AI** y un motor de extracción de texto seguro, la plataforma identifica cláusulas abusivas, detecta riesgos de laboralización encubierta y asimetrías de información, ofreciendo enmiendas inmediatas redactadas conforme a derecho y buscando jurisprudencia real del Poder Judicial de Chile (PJUD).

---

## 🚀 Características Clave
*   **Auditoría IA Dinámica:** Carga tu contrato en formato PDF o selecciona plantillas interactivas (Honorarios, Arrendamientos y NDA).
*   **Enmiendas en Tiempo Real:** El sistema resalta interactivamente el texto de riesgo y permite aplicar redacciones recomendadas con un solo clic.
*   **Chat Legal Contextual:** Interactúa directamente con un asistente legal inteligente que lee y comprende tu contrato en tiempo real para responder a tus dudas específicas.
*   **Buscador Jurisprudencial del PJUD:** Realiza búsquedas de jurisprudencia en tiempo real y obtén sentencias reales de la Corte Suprema y Cortes de Apelaciones con enlaces de acceso directo al PJUD.
*   **Seguridad y Privacidad Garantizadas:**
    *   Ingesta y parseo de PDF realizado 100% en memoria RAM (Zero Disk Persistence), destruyendo el búfer del archivo tras procesarlo.
    *   Almacenamiento de repositorios persistido de forma 100% local y segura en el navegador mediante `localStorage`.
*   **Diseño Premium:** Interfaz oscura, reactiva, elegante y fluida con estética *Glassmorphism* moderna y micro-animaciones.
*   **Motor de Simulación Integrado (Offline Fallback):** Capacidad de funcionar al 100% de manera simulada local si no se detecta conexión o claves de API.

---

## 📁 Documentos de Proyecto para Evaluadores Académicos (Profesores)
Para facilitar la entrega y evaluación de este proyecto en entornos académicos, se han redactado dos informes técnicos exhaustivos en español:

1.  **[Informe de Despliegue y Subida Web](docs/Informe_Subida_Web.md):**  
    Detalla la topología de red, la arquitectura desacoplada Frontend/Backend, la configuración del servicio en la nube **Render**, el flujo continuo de CI/CD vinculado a GitHub, el manejo seguro de variables de entorno y las políticas CORS implementadas en producción.
2.  **[Informe de Desarrollo, Metodología y Arquitectura](docs/Informe_Desarrollo_Proyecto.md):**  
    Explica la fundamentación del proyecto, la pila tecnológica elegida (React 19 + Vite + Node.js + Express + Gemini AI), la metodología de desarrollo ágil aplicada, los flujos internos de datos del sistema, las estrategias avanzadas de robustez y resiliencia implementadas y los detalles estéticos y de diseño del sistema.

---

## 🛠️ Estructura del Código Fuente
```text
LexAuditorChile/
├── docs/                                  # Informes académicos y documentación técnica
│   ├── Informe_Despliegue_Web.md          # Reporte detallado de hosting y CI/CD en Render
│   └── Informe_Desarrollo_Proyecto.md     # Reporte de metodología, arquitectura y UX
├── server/                                # Capa de Backend (Node.js/Express)
│   ├── server.js                          # Servidor de API, endpoints de Gemini y PDF-parse
│   ├── package.json                       # Dependencias backend (multer, pdf-parse, rate-limiter, google-ai)
│   └── Dockerfile                         # Configuración de contenedor Docker para el backend
├── src/                                   # Capa de Frontend (React 19 + Vite)
│   ├── App.jsx                            # Orquestador de la aplicación y flujo defensivo de invitado
│   ├── index.css                          # Estilos y variables globales de diseño (Glassmorphism)
│   └── components/                        # Componentes modulares reutilizables
│       ├── Sidebar.jsx                    # Menú de navegación interactivo
│       ├── LoginScreen.jsx                # Pantalla de ingreso seguro y modo invitado
│       ├── DocumentViewer.jsx             # Visor del contrato, resaltador de textos y chat interactivo
│       ├── CoworkerPanel.jsx              # Panel lateral de auditoría, riesgos y enmiendas
│       └── MockViews.jsx                  # Vistas de Repositorio, PJUD e historial de contratos
├── package.json                           # Configuración y scripts del frontend (Vite)
├── vite.config.js                         # Configuración del compilador de Vite
├── Dockerfile                             # Configuración Docker para servir el frontend
└── docker-compose.yml                     # Orquestador Docker multi-contenedor local
```

---

## 💻 Instrucciones para Ejecución Local

### Prerrequisitos
*   Node.js (versión 18 o superior)
*   NPM (instalado con Node.js)

### Paso 1: Configurar Variables de Entorno del Backend
Crea un archivo `.env` dentro de la carpeta `server/` basándote en el archivo [.env.example](server/.env.example):
```bash
PORT=5000
GEMINI_API_KEY=tu_api_key_de_google_gemini_aqui
FRONTEND_URL=http://localhost:5173
```
*(Nota: Si no posees una `GEMINI_API_KEY`, el sistema iniciará en modo simulación local inteligente sin interrupciones).*

### Paso 2: Iniciar el Servidor de Backend
1.  Abre una terminal en la carpeta del proyecto.
2.  Navega a la carpeta `server`:
    ```bash
    cd server
    ```
3.  Instala las dependencias necesarias:
    ```bash
    npm install
    ```
4.  Inicia el servidor en modo desarrollo:
    ```bash
    npm run dev
    ```
    *(El backend se ejecutará por defecto en `http://localhost:5000`)*.

### Paso 3: Iniciar el Servidor del Frontend
1.  Abre otra terminal en la raíz del proyecto.
2.  Instala las dependencias del cliente:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo Vite:
    ```bash
    npm run dev
    ```
4.  Abre en tu navegador la dirección indicada (por defecto `http://localhost:5173`).

---

## 🎨 Principios de Diseño Visual Aplicados
*   **Tema Oscuro:** Fondos premium profundos para una legibilidad óptima y reducción de fatiga ocular.
*   **Efecto Vidrio (Glassmorphic):** Marcos visuales con filtros de desenfoque (`backdrop-filter: blur()`) que transmiten elegancia y modernidad.
*   **Interactividad Intuitiva:** Resaltado semántico mediante colores codificados (Rojo para Riesgo Alto, Ámbar para Mediano, Verde para Enmiendas Aplicadas).
*   **Chat Flotante:** Un copiloto conversacional que se adapta de manera flotante y arrastrable por la interfaz de usuario.

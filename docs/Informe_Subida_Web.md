UNIVERSIDAD DE CHILE  
FACULTAD DE CIENCIAS FÍSICAS Y MATEMÁTICAS  
DEPARTAMENTO DE INGENIERÍA DE SOFTWARE  

--------------------------------------------------------------------------------

**INFORME TÉCNICO: DESPLIEGUE, INFRAESTRUCTURA Y SUBIDA WEB**  
**SISTEMA DE AUDITORÍA CONTRACTUAL CON INTELIGENCIA ARTIFICIAL**  
**PROYECTO: LEXAUDITOR CHILE**  

--------------------------------------------------------------------------------

**CÁTEDRA:** Memoria de Título / Ingeniería de Software  
**ESTUDIANTE:** Vicente Bustos  
**PROFESOR EVALUADOR:** Comisión Académica  
**FECHA:** Mayo de 2026  
**ENTORNO DE PRODUCCIÓN:** Render Cloud Services  
**REPOSITORIO DE CONTROL DE VERSIONES:** https://github.com/vicentebustos414-cyber/lexauditor.git  

--------------------------------------------------------------------------------

<div style="page-break-after: always;"></div>

**1. RESUMEN EJECUTIVO**

El presente documento técnico expone detalladamente la arquitectura de infraestructura, la topología de red y el proceso de puesta en producción (despliegue web) de la plataforma **LexAuditor Chile**. La solución ha sido diseñada bajo un modelo de arquitectura de software desacoplada (Frontend y Backend independientes), garantizando la separación de responsabilidades y facilitando la escalabilidad de cada componente. El proceso de despliegue se automatizó a través de un flujo de Integración y Despliegue Continuo (CI/CD) conectando de manera directa el repositorio de control de versiones GitHub con la plataforma de alojamiento en la nube **Render**. Se detallan los mecanismos de seguridad implementados para salvaguardar la confidencialidad de los datos jurídicos procesados y la inyección controlada de variables de entorno de producción.

--------------------------------------------------------------------------------

**2. ARQUITECTURA DE DESPLIEGUE Y TOPOLOGÍA DE RED**

La plataforma **LexAuditor Chile** opera bajo un modelo de arquitectura **Cliente-Servidor Desacoplada (Decoupled Architecture)**. En esta topología, la interfaz de usuario (Frontend) y el motor de procesamiento lógico (Backend) se ejecutan en entornos aislados y se comunican exclusivamente a través del protocolo seguro de transferencia de hipertexto (HTTPS) mediante una interfaz de programación de aplicaciones (API REST).

```
                      +------------------------------------------+
                      |         Interfaz de Usuario (Vite React) |
                      |    (Desplegado en Red de Entrega CDN)    |
                      +--------------------+---------------------+
                                           |
                                   HTTPS (REST API)
                                           |
                                           v
                      +--------------------+---------------------+
                      |       Servidor de Aplicaciones (Express) |
                      |       (Entorno de Producción en Render)  |
                      +--------------------+---------------------+
                                           |
                              Peticiones Cifradas HTTPS
                                           |
                                           v
                      +--------------------+---------------------+
                      |   Servicio de IA (Google Gemini API)     |
                      |        (Procesamiento de Modelos LLM)    |
                      +------------------------------------------+
```

**2.1. Capa de Cliente (Frontend)**  
Desarrollada en React 19 y optimizada mediante Vite. La compilación se empaqueta en un archivo estático autónomo (`dist/index.html`), reduciendo los tiempos de respuesta y optimizando la tasa de transferencia de datos hacia el navegador del cliente final.

**2.2. Capa de Servidor (Backend)**  
Desarrollada sobre la plataforma Node.js utilizando el framework Express. Actúa como pasarela lógica y de seguridad intermedia entre la interfaz de usuario y las APIs de Inteligencia Artificial de Google, evitando la exposición de claves privadas del lado del cliente.

--------------------------------------------------------------------------------

**3. INFRAESTRUCTURA DE HOSTING: SELECCIÓN DE RENDER**

Para el alojamiento de la solución se seleccionó la plataforma **Render Cloud Services**, una infraestructura como servicio (PaaS) que ofrece un entorno robusto y optimizado para aplicaciones modernas de alto rendimiento.

**3.1. Fundamentación de la Elección**  
1. **Despliegue Continuo Automatizado (CD):** Render se asocia de forma nativa a la rama principal (`main`) de GitHub. Cada confirmación exitosa (`git push`) desencadena un pipeline automático de compilación y despliegue sin interrupción del servicio (Zero Downtime Deployment).
2. **Seguridad y Cifrado (SSL/TLS):** Asignación automática de certificados SSL emitidos por Let's Encrypt para todas las comunicaciones, garantizando que el transporte de información legal viaje cifrado de punto a punto.
3. **Aislamiento de Recursos:** Ejecución de servicios en contenedores virtuales aislados, lo que optimiza la seguridad, la administración de memoria y los tiempos de procesamiento.

--------------------------------------------------------------------------------

**4. CONFIGURACIÓN Y DESPLIEGUE DE LA CAPA CLIENTE (FRONTEND)**

La interfaz de usuario de **LexAuditor Chile** se configuró mediante un empaquetado de alta densidad utilizando la dependencia `vite-plugin-singlefile`. 

**4.1. Proceso de Compilación de Alto Rendimiento**  
Este plugin inyecta de forma directa todos los archivos de script de React, las librerías de iconografía y los estilos globales de CSS Vanilla en una única plantilla HTML consolidada (`dist/index.html`).
* **Ventaja Metodológica:** Evita el retardo por peticiones HTTP múltiples de recursos pesados (CSS, JS secundarios), permitiendo que la UI renderice instantáneamente y funcione de manera autónoma sin riesgos de archivos huérfanos en el servidor de producción.
* **Estructura del Script de Compilación (`package.json`):**
  ```json
  "scripts": {
    "build": "vite build"
  }
  ```

--------------------------------------------------------------------------------

**5. CONFIGURACIÓN Y DESPLIEGUE DEL SERVIDOR LÓGICO (BACKEND)**

El backend opera como un Servicio Web (*Web Service*) en Node.js dentro de un contenedor dedicado gestionado por Render.

**5.1. Parámetros Técnicos del Entorno**  
* **Entorno de Ejecución:** Node.js
* **Directorio de Trabajo:** `/server`
* **Comando de Compilación (*Build Command*):** `npm install`
* **Comando de Inicio (*Start Command*):** `npm start` (ejecuta `node server.js`)

**5.2. Configuración del Almacenamiento Seguro de Credenciales**  
Las variables de entorno se inyectan dinámicamente en el contenedor desde el panel de control de Render, manteniendo la seguridad de las claves de acceso:
1. `GEMINI_API_KEY`: Credencial privada del SDK de Google Generative AI.
2. `PORT`: Asignado de forma dinámica por la infraestructura de red de Render.
3. `FRONTEND_URL`: URL de producción autorizada del cliente para restringir llamadas de orígenes no verificados.

--------------------------------------------------------------------------------

**6. MEDIDAS DE SEGURIDAD Y PRIVACIDAD EN EL SERVIDOR WEB**

Dada la naturaleza sumamente confidencial de los contratos jurídicos auditados, se diseñaron e incorporaron tres mecanismos estrictos de ciberseguridad en producción:

**6.1. Restricción Dinámica de Origen (CORS)**  
El backend cuenta con un middleware dinámico que valida y restringe los orígenes autorizados para realizar peticiones HTTP, previniendo secuestros de recursos de terceros (Cross-Origin Resource Sharing):
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => 
      allowed.trim().replace(/\/$/, '') === origin.trim().replace(/\/$/, '')
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por políticas de seguridad de LexAuditor.'));
    }
  }
}));
```

**6.2. Protección contra Denegación de Servicio (Rate Limiting)**  
Se implementó un middleware limitador de tasa para el procesamiento del endpoint `/api/audit`, permitiendo un máximo de **30 solicitudes en ventanas de 15 minutos** por dirección IP. Esto previene ataques DDoS y mitiga el riesgo de costos excesivos por uso de API de IA.

**6.3. Procesamiento Efímero en Memoria (Zero Disk Persistence)**  
Para garantizar la confidencialidad bajo los principios de *Privacidad por Diseño*:
* Se configuró `multer` con almacenamiento efímero directo en memoria RAM (`multer.memoryStorage()`).
* Los documentos PDF son leídos de manera transitoria por `pdf-parse`.
* Los datos no se registran en bases de datos físicas externas ni se almacenan en el disco duro del hosting, destruyéndose de la memoria del servidor inmediatamente después de enviar la respuesta al cliente.

--------------------------------------------------------------------------------

**7. PIPELINE DE INTEGRACIÓN Y DESPLIEGUE CONTINUO (CI/CD)**

El ciclo de publicación en producción sigue los estándares modernos de la cultura DevOps:

1. **Desarrollo y Control Local:** Los cambios de código se confirman localmente mediante Git.
2. **Sincronización Remota:** Se realiza un push hacia el repositorio remoto `https://github.com/vicentebustos414-cyber/lexauditor.git`.
3. **Disparador Automático (Webhook):** GitHub notifica de manera automática e instantánea a Render el nuevo commit en la rama `main`.
4. **Fase de Construcción (Build):** Render levanta un entorno virtual aislado, instala las dependencias de producción, verifica la sintaxis del backend (`node --check server.js`) y compila el frontend.
5. **Liberación en Caliente (Zero Downtime):** Si todas las validaciones son correctas, el tráfico de usuarios se redirige al nuevo contenedor sin interrumpir las sesiones activas. Si ocurre algún fallo de compilación, el sistema aborta automáticamente el despliegue y mantiene el contenedor anterior en línea.

--------------------------------------------------------------------------------

**8. VERIFICACIÓN Y MONITOREO DE SALUD**

Para monitorear el estado de la aplicación en producción, se incorporó un endpoint de diagnóstico rápido (`/api/health`):
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: !!process.env.GEMINI_API_KEY
  });
});
```
Este endpoint es consumido periódicamente por el frontend para validar de forma silenciosa la disponibilidad del servidor y el estado de la conexión con el motor de Inteligencia Artificial de Google.

--------------------------------------------------------------------------------

**9. CONCLUSIONES Y RECOMENDACIONES**

El despliegue en producción de **LexAuditor Chile** cumple rigurosamente con los estándares y requerimientos técnicos exigidos para un software de nivel comercial:
* **Disponibilidad:** El uso de Render asegura una alta tasa de actividad (Uptime) y redespliegues seguros sin pérdida de servicio.
* **Seguridad:** El manejo efímero de datos legales en memoria y las restricciones de CORS e IP limitan de manera contundente la exposición al riesgo del sistema.
* **Mantenibilidad:** El pipeline CI/CD garantiza que la incorporación de mejoras, correcciones normativas chilenas o actualizaciones de IA se integren de forma ágil y segura en producción.

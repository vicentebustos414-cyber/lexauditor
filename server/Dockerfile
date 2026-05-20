# --- Servidor Express de LexAuditor (Backend) ---
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar el código del servidor
COPY . .

# Exponer el puerto del API
EXPOSE 5000

# Ejecutar el servidor seguro en producción
CMD ["node", "server.js"]

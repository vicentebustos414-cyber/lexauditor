# --- Etapa 1: Build del Frontend (Vite) ---
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y construir bundle estático
COPY . .
RUN npm run build

# --- Etapa 2: Servidor Web Nginx ---
FROM nginx:alpine

# Copiar el build compilado al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx si es necesario
# (Por defecto, sirve index.html para SPAs)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

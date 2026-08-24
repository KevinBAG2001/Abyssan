FROM node:22-alpine

# Instalamos git en el contenedor Alpine para permitir las operaciones nativas
RUN apk add --no-cache git

WORKDIR /app

# Copiamos archivos de configuración de paquetes
COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/

# Instalamos pnpm globalmente
RUN npm install -g pnpm

# Instalamos dependencias
RUN pnpm install --filter @webkraken/server...

# Copiamos código fuente
COPY apps/server ./apps/server

WORKDIR /app/apps/server

EXPOSE 3001

CMD ["pnpm", "dev"]

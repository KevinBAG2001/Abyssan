FROM node:22-alpine

WORKDIR /app

# Copiamos archivos de configuración de paquetes
COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Instalamos pnpm globalmente
RUN npm install -g pnpm

# Instalamos dependencias del frontend
RUN pnpm install --filter @webkraken/web...

# Copiamos código fuente
COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 5174

CMD ["pnpm", "dev", "--host"]

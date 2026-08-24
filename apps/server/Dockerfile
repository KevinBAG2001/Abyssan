FROM node:22-alpine

# Instalamos git en el contenedor Alpine para permitir las operaciones nativas
RUN apk add --no-cache git

WORKDIR /app

# Copiamos archivos de configuración de paquetes
COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/

# Habilitamos pnpm con Corepack (sin npm como gestor del monorepo)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Instalamos dependencias
RUN pnpm install --filter @abyssan/server...

# Copiamos código fuente
COPY apps/server ./apps/server

WORKDIR /app/apps/server

EXPOSE 3001

CMD ["pnpm", "dev"]

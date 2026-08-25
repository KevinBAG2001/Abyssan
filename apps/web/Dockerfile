FROM node:22-alpine

WORKDIR /app

# Copiamos archivos de configuración de paquetes
COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Habilitamos pnpm con Corepack (sin npm como gestor del monorepo)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Instalamos dependencias del frontend
RUN pnpm install --filter @abyssan/web...

# Copiamos código fuente
COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 5174

CMD ["pnpm", "dev", "--host"]

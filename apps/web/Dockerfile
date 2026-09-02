FROM node:22-alpine

WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

RUN pnpm install --filter @abyssan/web...

COPY apps/web ./apps/web

RUN chown -R node:node /app

USER node

WORKDIR /app/apps/web

EXPOSE 5174

# --host: dentro del contenedor hay que escuchar 0.0.0.0; el host sigue en 127.0.0.1 vía Compose
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

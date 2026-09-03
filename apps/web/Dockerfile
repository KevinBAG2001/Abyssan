FROM node:22-alpine

WORKDIR /app

# Evita que Corepack baje pnpm latest en runtime y que pnpm pida TTY.
ENV CI=true
ENV COREPACK_DEFAULT_TO_LATEST=0
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_HOME=/usr/local/share/corepack

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@11.25.0 --activate \
  && chmod -R a+rX "$COREPACK_HOME"

RUN pnpm install --filter @abyssan/web...

COPY apps/web ./apps/web

RUN chown -R node:node /app

USER node

WORKDIR /app/apps/web

EXPOSE 5174

# --host: dentro del contenedor hay que escuchar 0.0.0.0; el host sigue en 127.0.0.1 vía Compose
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

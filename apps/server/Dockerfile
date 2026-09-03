FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

# Evita que Corepack baje pnpm latest en runtime y que pnpm pida TTY.
ENV CI=true
ENV COREPACK_DEFAULT_TO_LATEST=0
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_HOME=/usr/local/share/corepack

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@11.25.0 --activate \
  && chmod -R a+rX "$COREPACK_HOME"

RUN pnpm install --filter @abyssan/server...

COPY apps/server ./apps/server

RUN chown -R node:node /app

USER node

WORKDIR /app/apps/server

# Bind mounts (p. ej. Windows → Docker): el dueño del FS no coincide con USER node.
RUN git config --global --add safe.directory '*'

EXPOSE 3001

CMD ["pnpm", "dev"]

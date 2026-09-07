FROM node:22-alpine

RUN apk add --no-cache git su-exec

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
COPY apps/server/docker/entrypoint.sh /usr/local/bin/abyssan-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/abyssan-entrypoint.sh \
  && chmod 755 /usr/local/bin/abyssan-entrypoint.sh \
  && chown -R node:node /app

WORKDIR /app/apps/server

# El entrypoint decide: node si el volumen es escribible; si no, root
# (bind mounts Windows → .git/objects). safe.directory se aplica a --system.
EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/abyssan-entrypoint.sh"]
CMD ["pnpm", "dev"]

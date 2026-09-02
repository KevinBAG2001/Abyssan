FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

RUN pnpm install --filter @abyssan/server...

COPY apps/server ./apps/server

RUN chown -R node:node /app

USER node

WORKDIR /app/apps/server

EXPOSE 3001

CMD ["pnpm", "dev"]

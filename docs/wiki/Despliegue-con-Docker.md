# Despliegue con Docker

Describe **únicamente** lo que está en `docker-compose.yml` y los Dockerfiles. No es un compose de producción (eso es Fase 6 del plan).

## Servicios

| Servicio | Contenedor | Build | Puerto en el host |
|----------|------------|-------|-------------------|
| `server` | `abyssan-server` | `apps/server/Dockerfile` | `127.0.0.1:3001:3001` |
| `web` | `abyssan-web` | `apps/web/Dockerfile` | `127.0.0.1:5174:5174` |

Red: bridge `abyssan-net`. `web` declara `depends_on: server`. `restart: unless-stopped`.

## Imágenes

Ambas: `FROM node:22-alpine`. pnpm vía Corepack **11.25.0**. El server instala `git` con apk. Comando: `pnpm dev` (server) y `pnpm dev --host` (web). Es un arranque de **desarrollo** dentro del contenedor, no `pnpm start` sobre `dist/`.

## Variables

**server**

- `PORT=3001`
- `BIND_HOST=0.0.0.0` → el token es **obligatorio**
- `NODE_ENV=development`
- `PROJECTS_ROOT=/workspace/proyectos`
- `CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174`
- `ABYSSAN_API_TOKEN=${ABYSSAN_API_TOKEN:?…}` — **obligatorio**, sin default
- `ABYSSAN_HOME=/abyssan-home`
- `GIT_TERMINAL_PROMPT=0`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITLAB_CLIENT_*` — desde el `.env` del host (vacío si no están)
- `OAUTH_CALLBACK_URL` — default `http://localhost:3001/api/auth/callback`
- `ABYSSAN_SECRETO_CIFRADO` — opcional
- `ABYSSAN_GITHUB_TOKEN` / `ABYSSAN_GITLAB_TOKEN` — PAT opcional para push HTTPS
- `VITE_API_URL=http://localhost:3001` — callback OAuth hacia la SPA

**web**

- `VITE_API_URL=http://localhost:3001`
- `VITE_WS_URL=ws://localhost:3001`
- `VITE_ABYSSAN_API_TOKEN` = el mismo token

Define `ABYSSAN_API_TOKEN` en el `.env` del host. Compose no arranca sin ese valor.

### Cómo generar el token

No hay registro ni portal: es un secreto que **tú creas** y repites en ambas variables del `.env`:

```env
ABYSSAN_API_TOKEN=pega-aqui-tu-secreto
VITE_ABYSSAN_API_TOKEN=pega-aqui-tu-secreto
```

Generar uno aleatorio:

```powershell
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

```bash
openssl rand -base64 32
```

Tras cambiar `VITE_ABYSSAN_API_TOKEN`, reconstruye o reinicia el contenedor `web` para que Vite lo incorpore.

## Volúmenes

```yaml
# server
- ${ABYSSAN_PROJECTS_HOST:-.}:/workspace/proyectos
- ./apps/server/src:/app/apps/server/src
- ${ABYSSAN_GITCONFIG_HOST:-./apps/server/docker/gitconfig.host.placeholder}:/host-gitconfig:ro
- ${ABYSSAN_HOME_HOST:-abyssan-home}:/abyssan-home
```

`PROJECTS_ROOT` **dentro** del contenedor es `/workspace/proyectos`. En el host, el default es el checkout de Abyssan. Amplía con `ABYSSAN_PROJECTS_HOST` si necesitas varios repos.

`ABYSSAN_GITCONFIG_HOST` monta tu `~/.gitconfig` en `/host-gitconfig` (solo lectura). Al arrancar, el server copia **solo** `user.name` y `user.email` al gitconfig del contenedor. No incluye `safe.directory` ni helpers del host (en Windows esas rutas no son absolutas para Git de Linux y ensucian la consola).

El volumen `abyssan-home` (o bind `ABYSSAN_HOME_HOST`) es `ABYSSAN_HOME` dentro del contenedor: journal, snapshots y tokens OAuth cifrados.

Sin el montaje RW de proyectos, commit/stage fallarían (comentario en el propio compose).

## Puertos

Compose **no** publica `0.0.0.0:3001` en el host: usa `127.0.0.1`. El proceso interno sí escucha todas las interfaces del contenedor.

## Credenciales

OAuth y PAT se pasan desde el `.env` del host (`GITHUB_CLIENT_*`, `ABYSSAN_GITHUB_TOKEN`, …). El volumen `abyssan-home` (o `ABYSSAN_HOME_HOST`) guarda tokens cifrados. El contenedor **no** usa el Administrador de credenciales de Windows.

## Permisos

La imagen del web usa `USER node` tras `chown`. El server arranca como root y el **entrypoint** (`apps/server/docker/entrypoint.sh`) comprueba si `node` puede escribir en `.git/objects` del volumen:

- Si puede, el API **baja a** `node`.
- Si no (típico en bind mounts Windows → Docker Desktop), Git corre **como root en el contenedor** para que stage / commit / push funcionen. No se hace `chown` del repo del host.

Compose declara `healthcheck` sobre `GET /health`. Git está instalado en la imagen del server. Tras cambiar el Dockerfile: `docker compose up -d --build --force-recreate server`.

El probe no se limita a `.git/objects` (a menudo 777): también intenta escribir en las subcarpetas `XX/` (fan-out). En Docker Desktop para Windows esas suelen ser `755` y `git add` falla ahí aunque el padre sea escribible.

## Comandos

Desde la raíz del repositorio:

```bash
docker compose down
docker compose up --build
```

Solo web (si el API ya corre):

```bash
docker compose up --build -d web
```

Reinicio sin rebuild:

```bash
docker compose restart web
docker compose restart server
```

Estado:

```bash
docker compose ps
```

URLs en el host: [http://127.0.0.1:5174](http://127.0.0.1:5174) y [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Healthcheck

Compose declara `healthcheck` con `GET /health` en el proceso del server. Comprobación manual:

```bash
curl http://127.0.0.1:3001/health
```

Debe devolver `"status":"ok"`.

## Siguiente

- [Solución de problemas](./Solucion-de-problemas.md)
- [Seguridad técnica](./Seguridad.md)
- [Instalación](./Instalacion-y-configuracion.md)
- [Home](./Home.md)

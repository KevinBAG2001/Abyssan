# Instalación y configuración

Cómo levantar Abyssan en una máquina de desarrollo. Solo se documentan requisitos y comandos **presentes** en el repositorio.

## Requisitos

| Herramienta | Evidencia en el repo | Nota |
|-------------|----------------------|------|
| Node.js | CI (`.github/workflows/ci.yml`) usa **20**. Dockerfiles usan **`node:22-alpine`**. El README pide 20 LTS o superior. | No hay campo `engines` en `package.json`. |
| pnpm | CI: `pnpm/action-setup` versión **11.25.0**. Docker: `corepack prepare pnpm@11.25.0`. Campo `packageManager` en la raíz. | Gestor exclusivo. No uses `npm` ni `yarn` en este monorepo. |
| Git | El servidor Alpine instala `git` (`apk add git`). simple-git invoca Git del `PATH`. | Obligatorio en el host o en el contenedor del API. |
| Docker | `docker-compose.yml` y Dockerfiles | Opcional. |

## Instalación de dependencias

En la raíz del clon:

```bash
pnpm install
```

El lockfile es `pnpm-lock.yaml`. CI usa `pnpm install --frozen-lockfile`.

## Configuración de entorno

1. Copia `.env.example` a `.env` en la **raíz** del monorepo (no dentro de `apps/`).
2. El servidor carga ese archivo al arrancar (`cargarEntorno.ts`) sin pisar variables ya definidas en el proceso.
3. Si `PROJECTS_ROOT` está vacío, el proceso **sale** con código distinto de cero.

### Variables (de `.env.example` y código)

| Variable | Rol | Default observado |
|----------|-----|-------------------|
| `PROJECTS_ROOT` | Única raíz de repositorios. Obligatorio. | Ninguno; hay que definirla. |
| `PORT` | HTTP y WebSocket del API | `3001` |
| `BIND_HOST` | Interfaz de escucha | `127.0.0.1` |
| `NODE_ENV` | Entorno Node | `development` en el ejemplo |
| `ABYSSAN_API_TOKEN` | Token de instancia si el bind no es loopback | Vacío en localhost |
| `ABYSSAN_HOME` | Directorio de journal, auditoría y snapshots | `~/.abyssan` si no se define |
| `VITE_API_URL` | Origen REST de la SPA | `http://localhost:3001` |
| `VITE_WS_URL` | Origen WebSocket de la SPA | `ws://localhost:3001` |
| `VITE_ABYSSAN_API_TOKEN` | Mismo token, embebido por Vite para la SPA | Comentado en el ejemplo |

**Token de instancia:** no se descarga de ningún sitio. Genera una cadena aleatoria (p. ej. `openssl rand -base64 32` o el comando PowerShell del `.env.example`) y asígnala **igual** a `ABYSSAN_API_TOKEN` y `VITE_ABYSSAN_API_TOKEN`. Obligatorio con Docker; en desarrollo local con `BIND_HOST=127.0.0.1` suele omitirse.

| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth GitHub (forjas) | Opcional |
| `GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET` | OAuth GitLab (forjas) | Opcional |
| `OAUTH_CALLBACK_URL` | Callback OAuth | `http://localhost:3001/api/auth/callback` |
| `ABYSSAN_SECRETO_CIFRADO` | Semilla para cifrar tokens OAuth en disco | Si falta, se genera una clave local en `~/.abyssan/clave` |

Ejemplo **genérico** (no copies rutas de un usuario concreto):

```env
PROJECTS_ROOT=C:\ruta\a\repositorios
PORT=3001
BIND_HOST=127.0.0.1
NODE_ENV=development
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

En Linux:

```env
PROJECTS_ROOT=/home/usuario/proyectos
```

**`PROJECTS_ROOT` debe ser el directorio mínimo** que contiene los repos que Abyssan puede ver. No apuntes el perfil completo del usuario. Fuera de esa raíz, la API responde **403**.

> El archivo `.env.example` del repo puede incluir una ruta de Windows de ejemplo. Sustitúyela. Nunca subas `.env` (está en `.gitignore`).

## Frontera `PROJECTS_ROOT`

Toda operación con `repoPath` pasa por `validarRutaRepositorio`: resolución + `realpath`. Un symlink bajo la raíz que apunta **fuera** se rechaza. Clone/init solo aceptan uno o dos segmentos de carpeta bajo esa raíz (`validarDestinoNuevo`). Clone solo admite HTTPS o SSH, no `file://`.

## API y frontend

| Proceso | Script | URL por defecto |
|---------|--------|-----------------|
| API + WebSocket | `pnpm dev:server` | `http://127.0.0.1:3001` y `ws://127.0.0.1:3001` |
| SPA Vite | `pnpm dev:web` | `http://127.0.0.1:5174` (`vite.config.ts`: puerto **5174**, `host: '127.0.0.1'`) |

El orden importa: el API debe estar vivo antes de usar la UI. El cliente HTTP único es `HttpGitApi` (`VITE_API_URL`). El WebSocket envía `WATCH_REPO` y, si hay token, `?token=`.

Si `BIND_HOST` no es `127.0.0.1` / `localhost` / `::1`, el arranque **falla** sin `ABYSSAN_API_TOKEN`. El middleware Bearer cubre `/api/*` salvo el callback OAuth, que se registra antes. `/health` es público.

## Ejecución en desarrollo

```bash
pnpm install
pnpm dev:server
pnpm dev:web
```

También existe `pnpm dev` en la raíz (lanza ambos con `&`). En Windows PowerShell ese patrón puede no comportarse igual que en Unix; los scripts documentados y usados en el README son `dev:server` y `dev:web` por separado.

## Build, lint y pruebas

Scripts de la raíz (`package.json`):

```bash
pnpm lint
pnpm test
pnpm test:watch
pnpm build
```

Packages internos:

- `@abyssan/server`: `dev` (`tsx watch`), `build` (`tsc`), `start` (`node dist/index.js`).
- `@abyssan/web`: `dev` (Vite), `build`, `preview`.

## Healthcheck

Implementado como **HTTP**, no como `healthcheck:` de Compose:

```http
GET /health
```

Respuesta observada (no usa el envelope `{ exito, mensaje, datos }`):

```json
{
  "status": "ok",
  "producto": "Abyssan",
  "architecture": "Domain-Driven Design (DDD)",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Windows, Linux y Docker

| Entorno | Qué está en el repo |
|---------|---------------------|
| Windows | `.env.example` comenta una ruta `C:\...`. El validador de rutas contempla absolutas Win32. |
| Linux / macOS | Mismas variables; `PROJECTS_ROOT` POSIX. |
| Docker | `BIND_HOST=0.0.0.0` dentro del contenedor; token obligatorio. Volumen de proyectos en RW. Imagen Node 22. Detalle en [Despliegue-con-Docker.md](./Despliegue-con-Docker.md). |

## Siguiente

- [Arquitectura](./Arquitectura.md)
- [Despliegue con Docker](./Despliegue-con-Docker.md)
- [Solución de problemas](./Solucion-de-problemas.md)
- [Home](./Home.md)

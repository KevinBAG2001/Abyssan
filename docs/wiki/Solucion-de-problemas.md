# Solución de problemas

Escenarios respaldados por la arquitectura actual. **No** desactives `validarRutaRepositorio`, el token LAN ni el rate limit para “salir del paso”.

## La SPA no conecta con la API

1. Confirma `pnpm dev:server` y `GET http://localhost:3001/health`.
2. `VITE_API_URL` debe coincidir con ese origen (default `http://localhost:3001`).
3. Reinicia Vite después de cambiar variables `VITE_*` (se incrustan al arrancar).
4. En Docker, el navegador habla con `localhost` del **host**, no con el hostname interno del compose. Por eso `VITE_API_URL=http://localhost:3001` en el servicio `web`.

Si `BIND_HOST` no es loopback y falta el Bearer, la SPA recibe **401**. Define `ABYSSAN_API_TOKEN` y `VITE_ABYSSAN_API_TOKEN` iguales.

## El WebSocket no conecta

Mismo host/puerto que HTTP. `VITE_WS_URL` default `ws://localhost:3001`. Con token LAN, el cliente añade `?token=`. Cierre `4401` = token ausente o inválido. La UI reintenta cada 3 s (`websocket.ts`).

## El healthcheck falla

Compose no tiene probe. Si `curl /health` falla: el proceso no está en `PORT`, `PROJECTS_ROOT` vacío (el server ni siquiera llega a listen), o el puerto no está publicado en `127.0.0.1:3001`.

## El repositorio queda fuera de `PROJECTS_ROOT`

403 «Ruta de repositorio no autorizada». Mueve el repo bajo la raíz o cambia `PROJECTS_ROOT` al ancestro **mínimo** correcto y reinicia el API. Un symlink que escapa también es 403.

## Git no está disponible

simple-git necesita `git` en el `PATH`. En Docker del server, el Dockerfile ya hace `apk add git`. En el host de desarrollo, instala Git y verifica `git --version`.

## `dubious ownership` en Docker

Mensaje típico: `fatal: detected dubious ownership in repository at '/workspace/proyectos/...'`.

Ocurre cuando el volumen montado desde el host (Windows/macOS) no tiene el mismo dueño que el usuario `node` del contenedor. La imagen del server ya declara `safe.directory *` en el Dockerfile de desarrollo. Si ves el error tras un cambio manual de imagen:

```bash
docker compose up -d --build server
```

No ejecutes `git config --global` en tu máquina host para “arreglarlo”; el fix es dentro del contenedor.

## El contenedor carece de permisos

El volumen RW debe ser escribible por el UID del contenedor. No pongas el volumen en `:ro`. No ejecutes el API como root en el host para saltarte ACL: corrige el montaje.

## El volumen está en solo lectura

El compose oficial es RW a propósito (commit/stage). Si alguien montó `:ro`, las mutaciones Git fallarán. Restaura RW o trabaja sin Docker.

## pnpm inconsistente

Usa el pnpm del Corepack/CI (`11.25.0`). Borra `node_modules` y reinstala con `pnpm install`. No mezcles `npm i`. El lockfile debe quedar `pnpm-lock.yaml`.

## Cambié `ABYSSAN_PROJECTS_HOST` y no aparecen mis repos

Compose **no** remonta volúmenes en caliente. Tras editar `.env`:

```bash
docker compose up -d --force-recreate server
```

Comprueba el montaje real:

```bash
docker inspect abyssan-server --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}"
```

Debe mostrar tu carpeta de proyectos en el host, no solo el checkout de Abyssan. En Windows usa barras `/` en `.env` (`C:/Users/.../proyectos`). `PROJECTS_ROOT` (dev local) y `ABYSSAN_PROJECTS_HOST` (Docker) deben apuntar al mismo directorio.

## El push pide credenciales

El adapter usa Git del sistema (HTTPS u SSH). Mensajes típicos se traducen en `mensajeErrorGit` (auth, publickey, red). Conecta OAuth de forja, usa el agent SSH, o un credential helper. Abyssan **no** guarda passwords de Git en el repo.

## Los cambios del disco no llegan a la UI

1. WS conectado y `WATCH_REPO` enviado para el repo seleccionado.
2. El watcher ignora `node_modules`, gran parte de `.git` y tiene `depth: 4`. Archivos más profundos o bajo `.git/objects` no notifican.
3. Debounce 300 ms; refresca a mano con el botón del header si hace falta.
4. Ruta del repo distinta (slash de Windows vs canónica): el cliente compara `repoPath`; un mismatch evita el refresh.

## Rate limit (429)

Solo con bind no loopback y cliente no-localhost. Espera un minuto o trabaja contra loopback.

## Preview «no soportada»

`POST /api/git/preview` con `rebase` o `force-push` está en la lista del controlador pero el use case no lo implementa. Usa merge/reset/cherry-pick/revert.

## Siguiente

- [Instalación](./Instalacion-y-configuracion.md)
- [Despliegue con Docker](./Despliegue-con-Docker.md)
- [Seguridad técnica](./Seguridad.md)
- [Home](./Home.md)

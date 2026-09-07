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

## No hay identidad git en Docker

El modal «Identidad Git» avisa que faltan nombre y correo aunque en el host `git config --global user.name` funcione. No es un fallo de Abyssan ni hace falta Rust/Python: Git corre **dentro del contenedor**, con su propio `HOME` (`/home/node`). Ahí no está tu `~/.gitconfig`.

Solución: en el `.env` del host, monta ese archivo (solo lectura):

```env
ABYSSAN_GITCONFIG_HOST=C:/Users/tu_usuario/.gitconfig
```

Linux/macOS: `/home/tu_usuario/.gitconfig`. Tiene que ser un **archivo**. Si Docker creó una carpeta en esa ruta, bórrala y vuelve a crear el bind.

Al arrancar, Abyssan copia **solo** nombre y correo. No importa `safe.directory` del host (si lo incluyéramos, Git en Linux avisa `not absolute` con rutas `C:/...` y esa «C» se pintaba encima de la consola).

Luego:

```bash
docker compose up -d --build --force-recreate server
```

## `dubious ownership` en Docker

Mensaje típico: `fatal: detected dubious ownership in repository at '/workspace/proyectos/...'`.

Ocurre cuando el volumen montado desde el host (Windows/macOS) no tiene el mismo dueño que el usuario `node` del contenedor. La imagen del server ya declara `safe.directory *` en el Dockerfile de desarrollo. Si ves el error tras un cambio manual de imagen:

```bash
docker compose up -d --build server
```

No ejecutes `git config --global` en tu máquina host para “arreglarlo”; el fix es dentro del contenedor.

## Staging muestra el doble de archivos / no deja preparar

Abyssan listaba `modified` + `staged` + `created` de simple-git. Esas listas **se solapan**: un archivo ya preparado aparecía otra vez como “sin preparar”. El recuento del panel (p. ej. 55) no era `git status --short`.

`git add .` (preparar todos) y `stash` escriben blobs en `.git/objects`. En Docker, si el volumen del host no es escribible por el usuario `node`, Git responde `insufficient permission for adding an object` y **no indexa nada** (un solo archivo como `SECURITY.md` aborta el lote).

El entrypoint del server detecta eso y, si `node` no puede escribir, corre Git **como root dentro del contenedor** (sin `chown` del repo). Reconstruye el server:

```bash
docker compose up -d --build --force-recreate server
```

En los logs debe aparecer: `El volumen de repos no es escribible por node; Git corre como root…` o `Volumen de repos escribible por node`.

Comprueba en el host: `git status --short`. Si ahí hay ~20 rutas, el panel ya debe acercarse a esa cifra.

## El contenedor carece de permisos

El volumen debe ser RW (el compose oficial lo es). No montes `:ro`. Si tras recrear el server con el entrypoint actual `git add` sigue fallando, usa `pnpm dev:server` en la máquina (Git del host, mismos permisos que tu usuario).

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

El origin es HTTPS. Docker **no** ve el Administrador de credenciales de Windows. `ABYSSAN_API_TOKEN` es el token de la **app Abyssan**; **no** autentica contra GitHub.

### Cómo crear el PAT (paso a paso)

1. Inicia sesión en GitHub.
2. Abre el formulario ya marcado con alcance `repo`: [github.com/settings/tokens/new?scopes=repo&description=Abyssan](https://github.com/settings/tokens/new?scopes=repo&description=Abyssan).  
   Si el enlace no abre: foto de perfil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
3. **Note:** `Abyssan`. **Expiration:** 90 días (o la que prefieras).
4. En scopes, deja marcado **repo** (push/pull al repositorio). No hace falta marcar el resto.
5. **Generate token**. Copia el valor de una vez (`ghp_…`). GitHub **no lo vuelve a mostrar**.
6. En el `.env` de la **raíz** del monorepo (archivo gitignorado; no lo subas):

```env
ABYSSAN_GITHUB_TOKEN=ghp_pegaAquiLoQueCopiaste
```

Sin comillas ni espacios alrededor del valor.

7. Recrea el contenedor para que Compose inyecte la variable:

```bash
docker compose up -d --force-recreate server
```

8. En Abyssan, pulsa **Push**.

No pegues el PAT en Issues, PRs, commits ni el chat. Si se filtró: GitHub → Settings → Developer settings → tokens → revoke.

Otras opciones: OAuth (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` + **PRs → Conectar GitHub**), o push en el host con las credenciales de Windows: `git push -u origin <rama>`.

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

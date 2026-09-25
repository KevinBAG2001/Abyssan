# Seguridad técnica

Cómo está construida la frontera de Abyssan. Para **reportar** una vulnerabilidad usa [SECURITY.md](../../SECURITY.md), no Issues públicos.

## Modelo de amenaza (resumen)

El proceso Node corre con los permisos del usuario que lo lanza. El objetivo de los controles no es defender contra ese mismo usuario en el SO, sino:

1. No salir de `PROJECTS_ROOT` aunque un cliente mande `repoPath` malicioso.
2. No ejecutar shell arbitrario.
3. No filtrar tokens ni diffs por WS/auditoría.
4. No escuchar en todas las interfaces sin token.

Un atacante en LAN contra un `BIND_HOST` expuesto es un escenario **real** si se abre el puerto.

## Frontera `PROJECTS_ROOT`

Única raíz. Listado, clone, init y mutaciones deben resolver dentro de ella. Si la variable falta, el servidor no arranca.

## Normalización y realpath

`validarRutaRepositorio` combina `path.resolve` y `fs.realpathSync` (nativo o fallback). Un candidato léxico bajo la raíz cuyo **destino** sale de la raíz canónica se rechaza. Tests cubren traversal y symlink de escape.

`validarRutaArchivoEnRepositorio` exige ruta relativa, rechaza absolutas POSIX/Win32 y `..`, y vuelve a comprobar contención canónica.

`RemotePolicy` (`politicaRemoto.ts`): `validarUrlRemoto`, `validarDestinoFetch`, `validarDestinoPush`, `sanitizarRemotoParaMostrar`. Fetch, pull y push revalidan URLs ya persistidas en `.git/config`. Allowlist: HTTPS y SSH. Se rechazan `file://`, rutas locales, UNC, `git://`, `ext::` y credenciales embebidas. El nombre del remoto pasa por `validarNombreRemoto`.

Refs: `validarRefGit` en `politicaRefs.ts`. Contrato: se aceptan nombres, hashes, `HEAD`, `origin/main` y refs completas. **No** se aceptan `HEAD~1`, `HEAD^`, `@{`, globs ni rangos.

## Enlaces simbólicos

Un symlink **dentro** de `PROJECTS_ROOT` que apunta **fuera** es el caso de escape que Identidad (4.0) trata como 403. No asumas que “está debajo de la carpeta” en el explorador implica que realpath también lo está.

## simple-git y ausencia de shell

El camino Git es `GitController` → `GitUseCases` → `SimpleGitAdapter`. Las llamadas usan la API de simple-git o `raw` con lista de argumentos. No hay `child_process.exec` de comandos libres en ese camino.

Eso **no** elimina por sí solo todas las inyecciones: `GitUseCases` valida refs (`validarRefGit`), hashes (`validarHashGit`), nombres de remoto y URLs antes de `SimpleGitAdapter`. Un checkout/merge/reset con `-u`, `HEAD~1` o un remoto `file://` ya persistido se rechaza en aplicación, no en el CLI.

## Operaciones destructivas

La API exige `confirmado: true` en reset `--hard`, discard, borrar rama local y abortar merge. La UI (`ModalConfirmacion`) sigue siendo el gate humano. Un cliente REST sin ese campo recibe **400**.

Reset hard sucio y discard generan **snapshots** bajo `ABYSSAN_HOME/snapshots` (no en el repo). El GET del journal no incluye contenidos.

## WebSocket

- Handshake: cookie de sesión HttpOnly o primer mensaje `AUTH` (id de sesión o token permanente). `?token=` **no** autentica.
- Estado: **SEC-WS-01 parcialmente mitigado** — el vector de query string está cerrado; el secreto de instancia sigue siendo de larga duración en el servidor. Ver [Registro-de-riesgos.md](./Registro-de-riesgos.md).
- Validación de `repoPath` en `WATCH_REPO` (mismo validador HTTP). En LAN, `WATCH_REPO` antes de autenticar cierra `4401`.
- Política de watcher: `WATCH_REPO` / `UNWATCH` / disconnect / cleanup. Un watcher por repo; el último cliente cierra chokidar.
- `OPERACION_PROGRESO` y `operation.started|progress|completed|failed|cancelled` se emiten solo a clientes asociados a ese repo (`emitirARepo`).
- `emitirGlobal` existe para un aviso de instancia y exige un motivo. Las operaciones no lo usan.
- Payload de operación: `operationId`, `repository`, `operationType`, `timestamp`, `state`, `progress`. El fallo puede incluir `error` ya sanitizado. No se envía metadata, URL ni cuerpo de archivo.
- `REPO_CHANGED`: metadatos de cambio y `filePath` relativo. No se envía el cuerpo del archivo.
- Código de cierre `4401` si falta autenticación; `4403` si el Origin no está permitido.

## Secretos

| Secreto | Dónde |
|---------|--------|
| `ABYSSAN_API_TOKEN` | Solo entorno del servidor. La SPA abre `POST /api/sesion` y recibe cookie HttpOnly + id en memoria |
| OAuth client secret | Solo servidor |
| Tokens de forja | `~/.abyssan/credenciales.enc` (AES-256-GCM); clave en env o archivo `clave` |
| Git HTTPS | Injection puntual de token en URL al clonar/push si hay cuenta OAuth (`inyectarTokenHttps`) |

Auditoría JSONL sanitiza patrones de token y URLs `user:pass@`. Recorta mensajes.

## Logs

- `InMemoryCommandLogAdapter`: comando, duración, éxito; expuesto en `GET /api/git/logs`.
- `auditoria.jsonl`: tipo, repo sanitizado, estado, duración, error recortado. Sin diffs.
- Consola del proceso: rutas de repo al hacer watch (útil en dev; no es un canal para el navegador).

## LAN e Internet

Default loopback. Compose publica `127.0.0.1:3001` y `127.0.0.1:5174` en el **host**, con `BIND_HOST=0.0.0.0` **dentro** del contenedor → token obligatorio **sin default**. Exponer esos puertos a `0.0.0.0` en el host queda fuera de lo que Compose hace hoy y sería un cambio de amenaza.

No hay usuarios ni RBAC (Fase 6).

## Docker y privilegio mínimo

Desarrollo: el contenedor del API monta un volumen RW. `safe.directory` apunta solo a `PROJECTS_ROOT` (sin wildcard). El entrypoint baja a `node` cuando el volumen es escribible; si el bind mount Windows no deja escribir `.git/objects`, Git corre como root **solo en desarrollo y solo dentro del contenedor**.

Producción: `docker-compose.prod.yml` + `Dockerfile.prod` — usuario no-root, `NODE_ENV=production`, `no-new-privileges`, sin fallback a root.

## Limitaciones

- Sin `Origin`, curl en la misma máquina puede mutar (mismo usuario OS).
- Preview de rebase/force-push **fuera del contrato** (400). Merge, reset, cherry-pick y revert tienen preview no mutante en API y en `ModalConfirmacion`.
- El token permanente no se embebe en el bundle. Quien carga la SPA no lo ve; en LAN debe pegarlo una vez.
- Diseñado para uso local; no afirmar aislamiento multi-tenant.

## Reporte

[SECURITY.md](../../SECURITY.md) — Private Vulnerability Reporting. No uses Issues para exploits.

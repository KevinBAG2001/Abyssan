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

Clone: `validarUrlClone` bloquea `file://` y rutas locales.

## Enlaces simbólicos

Un symlink **dentro** de `PROJECTS_ROOT` que apunta **fuera** es el caso de escape que Identidad (4.0) trata como 403. No asumas que “está debajo de la carpeta” en el explorador implica que realpath también lo está.

## simple-git y ausencia de shell

El camino Git es `GitController` → `GitUseCases` → `SimpleGitAdapter`. Las llamadas usan la API de simple-git o `raw` con lista de argumentos. No hay `child_process.exec` de comandos libres en ese camino.

Eso **no** elimina por sí solo todas las inyecciones: hay que seguir validando nombres de rama, hashes y paths (el controller valida paths de archivo en diff/stage/discard/conflict).

## Operaciones destructivas

La API exige `confirmado: true` en reset `--hard`, discard, borrar rama local y abortar merge. La UI (`ModalConfirmacion`) sigue siendo el gate humano. Un cliente REST sin ese campo recibe **400**.

Reset hard sucio y discard generan **snapshots** bajo `ABYSSAN_HOME/snapshots` (no en el repo). El GET del journal no incluye contenidos.

## WebSocket

- Validación de `repoPath` en `WATCH_REPO` (mismo validador HTTP).
- Token por query si LAN.
- Payload: metadatos de cambio y de operación, `filePath` relativo. No se envía el cuerpo del archivo.
- Código de cierre `4401` si el token falta cuando es obligatorio; `4403` si el Origin no está permitido.

## Secretos

| Secreto | Dónde |
|---------|--------|
| `ABYSSAN_API_TOKEN` | Entorno del servidor; opcionalmente `VITE_*` en la SPA (queda en el bundle de Vite) |
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

El contenedor del API monta un volumen RW. El origen por defecto es el checkout (`.`), configurable con `ABYSSAN_PROJECTS_HOST`. El proceso corre como `USER node`. Git está instalado en la imagen del server.

## Limitaciones

- Sin `Origin`, curl en la misma máquina puede mutar (mismo usuario OS).
- Preview rebase/force-push no implementados en el use case.
- Token de Vite es visible para quien carga la SPA.
- Diseñado para uso local; no afirmar aislamiento multi-tenant.

## Reporte

[SECURITY.md](../../SECURITY.md) — Private Vulnerability Reporting. No uses Issues para exploits.

# Referencia de API

Rutas en `index.ts`, `GitRoutes.ts`, `AuthForjasRoutes.ts` y `ForjasRoutes.ts`. Base: `http://localhost:3001` (`PORT`).

## Contrato

`/api/*` (salvo health y matices):

```json
{ "exito": true, "mensaje": "texto", "datos": {}, "meta": {} }
```

`GET /health` usa `{ status, producto, architecture, timestamp }`. `HttpGitApi` expone `datos`.

## Autenticación y códigos

- `/health` público.
- `/api/auth/callback` público (antes del Bearer).
- Resto `/api/*`: Bearer si bind no es loopback. Falta: **401**.
- Rate limit no-loopback: 90/min, **429**. Loopback no se penaliza.
- Fuera de `PROJECTS_ROOT`: **403**. Origin de mutación no permitido: **403**. Validación / falta de `confirmado`: **400**. Amend remoto sin confirmar: **409**. Forja: **503**. Otros: **500**.
- CORS: lista `CORS_ORIGINS` (SPA en `:5174` por defecto).

## Health

`GET /health` — no muta.

## Git consulta

`path`/`root` pasan por `validarRutaRepositorio`. `file` por `validarRutaArchivoEnRepositorio`.

| Método | Ruta | Query | Mutación |
|--------|------|-------|----------|
| GET | `/api/git/repos` | `root?` | No |
| GET | `/api/git/status` | `path` | No |
| GET | `/api/git/commits` | `path`, `limit` default 800 | No |
| GET | `/api/git/branches` | `path` | No |
| GET | `/api/git/branches/compare` | `path`, `base`, `target` | No |
| GET | `/api/git/diff` | `path`, `file?`, `staged` | No |
| GET | `/api/git/remotes` | `path` | No |
| GET | `/api/git/stashes` | `path` | No |
| GET | `/api/git/tags` | `path` | No |
| GET | `/api/git/conflict` | `path`, `file` | No |
| GET | `/api/git/amend-info` | `path` | No |
| GET | `/api/git/reflog` | `path`, `limit` default 20 | No |
| GET | `/api/git/deshacer` | `path?` | No |
| GET | `/api/git/journal` | `path` | No |
| GET | `/api/git/identity` | `path` | No |
| GET | `/api/git/logs` | — | No |
| GET | `/api/git/operaciones` | — | No |

## Git mutación

JSON body. Confirmación de UI, no de API (excepto `confirmarRemoto`).

| Método | Ruta | Cuerpo principal | Efecto |
|--------|------|------------------|--------|
| POST | `/api/git/stage` | `repoPath`, `file?`, `all?` | Índice |
| POST | `/api/git/unstage` | `repoPath`, `file` | Índice |
| POST | `/api/git/commit` | `repoPath`, `message`, `description?` | Commit; `datos.hash` |
| POST | `/api/git/checkout` | `repoPath`, `target` | HEAD/WT |
| POST | `/api/git/branch` | `repoPath`, `branchName`, `startPoint?` | Ref |
| POST | `/api/git/branch/delete` | `repoPath`, `branchName` | Ref; 400 si HEAD |
| POST | `/api/git/branch/rename` | `repoPath`, `nombreActual`, `nombreNuevo` | Ref |
| POST | `/api/git/merge` | `repoPath`, `sourceBranch`, `noFf?` | Merge |
| POST | `/api/git/merge/abort` | `repoPath` | Abort |
| POST | `/api/git/merge/continue` | `repoPath` | Continue |
| POST | `/api/git/pull` | `repoPath`, `modo?` | Integra remoto |
| POST | `/api/git/push` | `repoPath` | Push |
| POST | `/api/git/fetch` | `repoPath`, `prune?` default true | Refs remotas |
| POST | `/api/git/remote/add` | `repoPath`, `name`, `url` | Remote |
| POST | `/api/git/remote/remove` | `repoPath`, `name` | Remote |
| POST | `/api/git/stash/save` | `repoPath`, `message?` | Stash |
| POST | `/api/git/stash/pop` | `repoPath`, `index?` | Pop |
| POST | `/api/git/stash/drop` | `repoPath`, `index?` | Drop |
| POST | `/api/git/tag` | `repoPath`, `tagName`, `targetHash?` | Tag |
| POST | `/api/git/cherry-pick` | `repoPath`, `hash` | Commit |
| POST | `/api/git/revert` | `repoPath`, `hash` | Commit |
| POST | `/api/git/reset` | `repoPath`, `type`, `target` | Reset |
| POST | `/api/git/discard` | `repoPath`, `file` | WT |
| POST | `/api/git/conflict/resolve` | `repoPath`, `file`, `resolvedContent` | Archivo+stage |
| POST | `/api/git/clone` | `url`, `nombreCarpeta` | `datos.path` |
| POST | `/api/git/init` | `nombreCarpeta` | `datos.path` |
| POST | `/api/git/amend` | `repoPath`, `message`, `confirmarRemoto?` | Amend |
| POST | `/api/git/identity` | `repoPath`, `nombre`, `correo`, `global?` | Config |
| POST | `/api/git/deshacer` | `repoPath`, `id?` | Undo punta |
| POST | `/api/git/preview` | `repoPath`, `operacion`, params | **No muta** |

Preview: el controlador acepta merge, rebase, reset, cherry-pick, revert, force-push. El use case implementa merge, reset, cherry-pick, revert. Rebase y force-push: error «no soportada».

## Auth y forjas

| Método | Ruta | Notas |
|--------|------|--------|
| GET | `/api/auth/forjas` | Cuentas sin secretos |
| GET | `/api/auth/github/iniciar` | `datos.url` |
| GET | `/api/auth/gitlab/iniciar` | `datos.url` |
| GET | `/api/auth/callback` | `code`, `state` |
| DELETE | `/api/auth/forjas/:proveedor` | github \| gitlab |
| GET | `/api/forjas/solicitudes` | query `path` |
| GET | `/api/forjas/solicitudes/:numero/diff` | query `path` |
| POST | `/api/forjas/solicitudes/:numero/checkout` | `repoPath`, `ramaOrigen`, `esFork` |
| POST | `/api/forjas/solicitudes` | `titulo`, `base`, `cabeza`; **201** |

WebSocket: [Arquitectura](./Arquitectura.md).

## Siguiente

- [Operaciones Git](./Operaciones-Git.md)
- [Seguridad técnica](./Seguridad.md)
- [Home](./Home.md)

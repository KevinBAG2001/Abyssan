# Motor de operaciones Git — Bloque C

Este documento es **análisis y contrato**. No introduce Redis, BullMQ, Kafka ni workers externos.

## Qué hay hoy

`OperationManager` es el motor in-process: crea un `operationId`, transiciona estados y mide duración. `RepositoryOperationLock` serializa mutaciones incompatibles **por repositorio**. `RegistroOperaciones` sigue emitiendo progreso WS con estados en español para la UI.

Camino del piloto (merge):

```text
UI → HttpGitApi.merge
  → POST /api/git/merge
  → GitController.merge
  → GitUseCases.merge
  → OperationManager.ejecutar
  → RepositoryOperationLock.adquirir
  → SimpleGitAdapter.mergeBranch
  → simple-git → filesystem
```

`GitUseCases.ejecutarExclusiva` (pull, push, fetch, checkout, reset, etc.) también pasa por `OperationManager` + lock para no competir con el piloto. `ColaOperaciones` se conserva como primitiva; ya no es el único mecanismo del camino caliente.

## Estados del motor

| OperationManager | RegistroOperaciones / UI |
|------------------|--------------------------|
| queued | en_cola |
| running | corriendo |
| completed | exito |
| failed | fallo |
| cancelled | fallo (reservado; sin API de cancelación todavía) |

## Clasificación y exclusividad

| Clase | Ejemplos | Lock |
|-------|----------|------|
| Lectura | status, log, diff, branches, tags, preview | No |
| Mutación ligera | stage, unstage, commit, crear/renombrar rama, tag | Aún no migradas al motor |
| Mutación exclusiva | fetch, pull, push, clone, init, merge, rebase, reset, checkout, discard, stash pop, cherry-pick, revert, amend, borrarRama, deshacer | Exclusiva por repo (WAIT) |

Repo A en `merge` + repo A `pull` → **WAIT**.  
Repo A en `merge` + repo B `merge` → **continúa**.  
Repo A en `merge` + repo A `status` → **continúa** (lectura).

No hay lock global.

## Ejecución desacoplada (Bloque D)

Siguen en memoria. No hay cola externa.

| Operación | HTTP | Motivo |
|-----------|------|--------|
| clone, fetch, pull, push | `202` + `datos.operacion` | Dependen de red y pueden durar más que el cliente |
| rebase | El mismo `POST /pull` con `modo: "rebase"` | No hay ruta de rebase aparte |
| merge, cherry-pick | La petición espera el resultado | Son locales; el conflicto vuelve en esa respuesta |

`GET /api/git/operaciones` sigue siendo el historial en español de la UI. `GET /api/git/operaciones/:id` lee el motor (`operationId`, `state`, `progress`, `error` sanitizado) y no incluye metadata.

Eventos WS, solo con `emitirARepo`: `operation.started`, `operation.progress`, `operation.completed`, `operation.failed`, `operation.cancelled`. Campos mínimos: `operationId`, `repository`, `operationType`, `timestamp`, `state`. No viajan diffs, URLs ni metadata. `OPERACION_PROGRESO` se mantiene para la UI.

`cancelar` solo aplica en `queued`. Un `simple-git` ya en marcha no se aborta.

## Qué no se implementa ahora

- Cola persistente
- Cancelación cooperativa de `simple-git` en ejecución
- Workers en otro proceso
- Prioridades, dead-letter, retries distribuidos
- Migrar stage/commit/tag y el checkout de forjas al motor (deuda: forjas sigue sin cola)
- `POST /operations` genérico: cada mutación conserva su ruta (`/pull`, `/push`, `/fetch`, `/clone`)

## Siguiente paso

Migrar el resto de mutaciones ligeras y abort/continue merge cuando el piloto siga estable. Añadir REJECT solo si un preview lo exige (por ejemplo reset hard mientras corre un merge).

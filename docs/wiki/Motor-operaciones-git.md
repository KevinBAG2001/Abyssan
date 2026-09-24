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

## Qué no se implementa ahora

- Cola persistente
- Cancelación cooperativa de `simple-git`
- Workers en otro proceso
- Prioridades, dead-letter, retries distribuidos
- Migrar stage/commit/tag y el checkout de forjas al motor (deuda: forjas sigue sin cola)

## Siguiente paso

Migrar el resto de mutaciones ligeras y abort/continue merge cuando el piloto siga estable. Añadir REJECT solo si un preview lo exige (por ejemplo reset hard mientras corre un merge).

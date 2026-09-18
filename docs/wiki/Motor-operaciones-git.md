# Motor de operaciones Git — diseño (ciclo 2)

Este documento es **análisis y contrato**. No introduce Redis, BullMQ, Kafka ni workers externos.

## Qué hay hoy

`ColaOperaciones` serializa mutaciones **por repositorio** en el proceso Node. `RegistroOperaciones` emite progreso WS acotado al repo. `GitUseCases.ejecutarExclusiva` usa esa cola.

`RepositoryOperationLock` es el contrato explícito (con tests) para la siguiente iteración. Todavía no sustituye la cola en el camino caliente: no se reescribe el engine en este ciclo.

## Clasificación

| Clase | Ejemplos | Lock | Async / progreso | Cancelación |
|-------|----------|------|------------------|-------------|
| Lectura | status, log, diff, branches, tags | No | No | No aplica |
| Mutación ligera | stage, unstage, commit, crear/renombrar rama, tag | Esperar si hay pesada en el mismo repo | No obligatorio | No |
| Mutación pesada | fetch, pull, push, clone, merge, rebase, reset, cherry-pick, revert | Exclusiva por repo (WAIT) | Sí (progreso WS) | Diferido al próximo ciclo |

Repo A en `pull` + repo A `rebase` → **WAIT** (no REJECT en v1).  
Repo A en `pull` + repo B `pull` → **continúa**.

No hay lock global.

## Qué requiere cola + progreso ya

clone, fetch, pull, push, rebase-via-pull. La UI de Operaciones ya muestra en cola / corriendo / éxito / fallo.

## Qué no se implementa ahora

- Cola persistente
- Cancelación cooperativa de `simple-git`
- Workers en otro proceso
- Prioridades, dead-letter, retries distribuidos

## Siguiente paso (no este ciclo)

Cablear `RepositoryOperationLock` detrás de `ejecutarExclusiva` y añadir REJECT solo si un preview lo exige (por ejemplo reset hard mientras corre un merge).

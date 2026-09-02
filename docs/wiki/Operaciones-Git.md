# Operaciones Git

Clasificación de operaciones **encontradas en** `GitUseCases`, `SimpleGitAdapter` y la UI (`useMutacionesGit`). La confirmación, cuando existe, es **solo de interfaz**; la API no exige un campo de confirmación salvo `confirmarRemoto` en amend.

Leyenda: **Disponible** (ruta + caso de uso), **Parcial**, **Planificado / no localizado**.

## Consulta de estado

Solo lectura. `GET /api/git/status`. Disponible.

## Historial (grafo)

Solo lectura. `GET /api/git/commits` (límite por defecto 800). Highlight, merge-base y caminos: **planificado** (Fase 4.4).

## Diff

Solo lectura. `GET /api/git/diff`. El visor colorea hunks. **No** hay endpoint de stage por hunk o línea.

## Stage y unstage

Modifica el índice, no el working tree ni refs. Por **archivo** o `all`. Disponible. Stage por hunk/línea: **no localizado**.

## Commit

Crea commit; mueve HEAD. Undo vía journal (`reset --soft`). Disponible.

## Checkout

Cambia HEAD y, según Git, WT/índice. Undo si había rama previa. Disponible.

## Ramas

| Operación | Refs | Confirmación UI | Estado |
|-----------|------|-----------------|--------|
| Listar / comparar | No | No | Disponible |
| Crear / renombrar | Sí | No | Disponible |
| Borrar local | Sí | Escribir el nombre. Adapter rechaza borrar HEAD | Disponible |

## Etiquetas

Listar y crear. No hay ruta de borrado de tag. Disponible (CRUD incompleto).

## Stash

save, pop, drop, listado. Disponible (gestión básica).

## Merge

Modifica WT/índice/refs si Git aplica. Journal: no deshacible (usar abort). Abort/continue disponibles. Preview API `operacion=merge` **no muta**. UI de preview **no cableada**.

## Cherry-pick y revert

Nuevo commit. Journal no deshacible. Preview API disponible. UI: menú contextual.

## Reset

| Tipo | WT | Índice | HEAD | Confirmación UI |
|------|----|--------|------|-----------------|
| soft | No | No | Sí | No |
| mixed | No | Sí | Sí | No |
| hard | Sí | Sí | Sí | Sí; sucio: escribir `RESET`. Snapshot para undo |

## Fetch / pull / push

- Fetch: refs remotas; `prune` default true.
- Pull: `modo` `merge` o `rebase`. No es rebase interactivo. Journal no deshacible.
- Push: sin `--force-with-lease` en el adapter. Marca undo bloqueado.

## Remotos

Listar, add, remove. Disponible.

## Conflictos

GET conflicto 3-way; POST resolve escribe y hace stage. Disponible.

## Clone e init

Destino ⊆ `PROJECTS_ROOT` (máx. dos niveles). Clone HTTPS/SSH. Journal no deshacible.

## Discard

WT. Confirmación UI. Snapshot para undo.

## Amend

Solo mismo `user.email`. Remoto: `confirmarRemoto` o 409. Journal no deshacible.

## Identidad git, journal, forjas

Identidad: `user.name` / `user.email`. Journal persistente y deshacer de la punta. Forjas: OAuth y PR/MR; 503 si caen, Git local intacto.

## No localizado (README o plan)

Blame; stage hunk/línea; rebase visual; preview rebase/force-push en el use case; UI Cancelar/Ver/Ejecutar de preview; Explain Mode; worktrees.

## Siguiente

- [Referencia de API](./Referencia-de-API.md)
- [Seguridad técnica](./Seguridad.md)
- [Home](./Home.md)

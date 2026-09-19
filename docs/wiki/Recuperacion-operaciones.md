# Contrato de recuperación (ciclo 2)

No existe un `RecoveryManager` gigante. Este archivo declara qué se puede deshacer **de verdad** hoy.

## Campos del contrato

| Campo | Significado |
|-------|-------------|
| Operation | Tipo de `GitOperacion` / journal |
| Before State | Qué se conserva antes de mutar |
| After State | Qué queda en el repo |
| Recovery Strategy | Cómo se revierte |
| Recovery Availability | `disponible` / `parcial` / `no` |

## Operaciones actuales

| Operation | Before State | After State | Recovery Strategy | Recovery Availability |
|-----------|--------------|-------------|-------------------|------------------------|
| commit | hash HEAD previo | nuevo commit | `reset --soft` al hash anterior | disponible |
| checkout | rama previa | HEAD en destino | checkout a la rama previa | disponible si había rama |
| crearRama | — | rama nueva | borrar la rama (checkout previo si hace falta) | disponible |
| borrarRama | hash de la rama | rama ausente | recrear en el hash | disponible si se guardó el hash |
| renombrarRama | nombre anterior | nombre nuevo | rename inverso | disponible |
| discard | snapshot de archivo | working tree limpio en ese path | restaurar snapshot | disponible si había contenido |
| reset hard | HEAD + snapshot de sucios | HEAD movido | `reset --hard` al HEAD previo + snapshot | disponible si había HEAD |
| reset soft/mixed | HEAD previo | HEAD movido | `reset --hard` al HEAD previo | disponible; el índice/worktree no se reconstruye fino |
| pull | — | historia integrada | — | no (motivo en journal) |
| push | — | remoto actualizado | — | no |
| fetch | — | refs remotas | — | no (no muta worktree) |
| merge | — | merge commit o conflictos | abortar merge, no “deshacer” | parcial (`merge --abort`) |
| cherry-pick / revert | — | nuevo commit o conflictos | — | no (reflog, no UI) |
| clone / init | — | carpeta nueva | borrar a mano | no |
| amend | mensaje/árbol previos | commit reescrito | — | no (reflog) |

## Regla

No se promete recovery si no hay garantía técnica (hash, snapshot o comando inverso). El reflog es red de emergencia, no la UI principal.

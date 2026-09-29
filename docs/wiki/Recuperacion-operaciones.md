# Contrato de recuperación

No hay un `RecoveryManager` que deshaga cualquier Git. Este archivo dice qué se puede recuperar **de verdad** y qué no.

La recuperación no vive en el estado de React ni en variables del proceso Node. Si hace falta una garantía, el dato tiene que estar en el repositorio Git o en un archivo local que sobreviva al cierre del proceso.

## Qué se evaluó

| Mecanismo | Decisión |
|-----------|----------|
| Reflog (`HEAD@{n}`) | No es la recuperación. El selector se mueve con cada operación nueva y `git gc` lo expira. `validarRefGit` rechaza `@{`. Sigue en la consola como red de emergencia manual. |
| Ref temporal | Sí, para **reset**. `refs/abyssan/recovery/<operationId>` apunta al HEAD previo y lo mantiene alcanzable. |
| Snapshot de archivos | Sí, solo para discard y para archivos sucios de un reset hard. No se copia el repositorio. |
| Journal | Índice local en `ABYSSAN_HOME/journal.json` (o el directorio inyectado en tests). No sustituye a la ref. |
| Backup del repo | No. Un reset no lo necesita. |

## Journal

Archivo local, versión 2. Tope: **60** entradas por repositorio y **200** en total. No hay caducidad por tiempo. Al podar se borra el snapshot asociado. La ref de una entrada podada deja de estar “viva”; la siguiente operación de ese repo la borra con `git update-ref -d` si ya no está en el índice.

Equivalencia con el diseño del bloque:

| Diseño | Campo en código |
|--------|-----------------|
| operationId | `id` |
| repository | `repoPath` |
| operation | `tipo` |
| before | `antes.head` |
| after | `despues.head` |
| timestamp | `timestamp` |
| status | `estado`: `en_curso`, `completada`, `fallida`, `recuperada` |
| recoveryInformation | `recuperacion` (`estrategia`, `ref`, `hash`, `snapshotId`, `disponible`) |

`en_curso` se escribe **antes** de mutar. Si el proceso muere después del reset y antes de marcarlo `completada`, la ref y el journal en disco siguen bastando para deshacer.

El GET `/api/git/journal` no envía el payload, el hash completo ni el contenido de los snapshots. Sí envía `estado`, `estrategiaRecuperacion` y, en un reset recuperable, el comando `git reset` hacia la ref.

## Reset (operación recuperable)

Antes: `HEAD = A`. Después: `HEAD = B`. Recuperación: `HEAD = A`.

1. Se lee `A` con `rev-parse HEAD`.
2. Se escribe el journal en `en_curso`.
3. `git update-ref refs/abyssan/recovery/<id> A` **antes** del reset.
4. Se ejecuta el reset hacia el destino.
5. El journal pasa a `completada` con `despues.head`.

Deshacer resuelve la **ref** (`rev-parse`) y hace reset a esa ref. El hash guardado solo comprueba que la ref no fue reescrita. Si la ref no está, Abyssan **no** hace reset al hash del JSON. Si la ref y el hash no coinciden, aborta y no mueve HEAD.

| Tipo | Recuperación que sí se garantiza | Lo que no |
|------|----------------------------------|-----------|
| soft | `git reset --soft` a la ref. HEAD vuelve. El soft no había tocado índice ni worktree. | — |
| mixed | `git reset --soft` a la ref. HEAD vuelve. El worktree sucio que el mixed dejó intacto sigue ahí. | El índice previo al mixed **no** se reconstruye. |
| hard | `git reset --hard` a la ref. Los archivos sucios copiados en el snapshot se reponen encima. | Borrados, directorios, archivos de más de 2 MB o por encima de 50 archivos no entran al snapshot. |

Un reset que falla y **no** mueve HEAD queda `fallida`, sin ref y sin deshacer. No se promete recuperación de algo que no cambió.

## Qué más puede deshacer el journal (sin esta ref)

Estas operaciones siguen el journal en disco (sobreviven a cerrar Abyssan) pero **no** están ancladas con `refs/abyssan/recovery/`. No tienen la misma garantía frente a `git gc` si el objeto deja de ser alcanzable y el reflog expira.

| Operación | Cómo se deshace | Límite |
|-----------|-----------------|--------|
| commit | `reset --soft` al hash guardado | Hace falta ese hash en el journal |
| checkout | checkout a la rama previa | Solo si había rama |
| crear / borrar / renombrar rama | comando inverso | Borrar rama exige el hash guardado |
| discard | restaurar snapshot del archivo | Si había contenido y cupo en el snapshot |

Solo se deshace la **punta** (la última no deshecha de ese repo). No hay rehacer. Varias operaciones seguidas no se deshacen de un golpe.

## Qué no se deshace

pull, push, fetch, merge (usar abortar merge), cherry-pick, revert, amend, clone e init. El journal lo deja escrito con el motivo. El reflog no pasa a ser un botón de deshacer.

## Reinicio y cierre del proceso

| Hecho | Reset con ref ya anclada | Resto del journal | Estado de React |
|-------|--------------------------|-------------------|-----------------|
| Cerrar o reiniciar Abyssan | Se puede deshacer: el journal está en disco y la ref en `.git` | Se puede deshacer lo que el journal ya marcó como deshacible | Se pierde; no es la recuperación |
| El proceso muere después de anclar y después del reset, antes de `completada` | Se puede deshacer (`en_curso`) | — | — |
| El proceso muere antes de crear la ref | No se promete: HEAD no llegó a moverse, o no hay ancla | — | — |
| `journal.json` ilegible | No se promete deshacer. En ese proceso no se borran las refs. | El índice no se lee | — |
| Borrar la ref a mano | No se restaura desde el hash del journal | — | — |

La prueba de reinicio crea **instancias nuevas** que leen `journal.json` y el repositorio. No mata un PID; el mecanismo es el mismo que vería un proceso nuevo.

## Regla

No se promete recuperación si no hay ref, snapshot o comando inverso que de verdad pueda aplicarse. Recordar un hash en memoria, o solo en el JSON, no alcanza para el reset.

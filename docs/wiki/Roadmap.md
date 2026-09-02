# Roadmap

Fuente: `docs/PLAN-TRABAJO.md` (PRD v3) contrastada con el código en esta auditoría. **Puede cambiar.** No hay fechas de entrega ni porcentajes de avance verificables; las duraciones del plan son semanas-persona de trabajo enfocado, no un calendario.

## Cómo leer el estado

| Etiqueta | Significado aquí |
|----------|------------------|
| Disponible | Hay implementación comprobable |
| Parcial | Plan o README lo dan por hecho; el código cubre solo una parte |
| Planificado | En el plan, no localizado o checkbox abierto |
| Fuera del horizonte cercano | Explícitamente fuera (IA, cloud, etc.) |

## Daily Driver y power (Fases 0–3)

El plan las marca **cerradas**. En código sí existen clone/init, discard, conflictos 3-way, ramas, fetch, pull, grafo, stash, paleta, forjas OAuth, envelope `{ exito }`, token LAN.

**Parcial respecto al texto del plan/README:**

- Stage por hunk/línea: no hay API.
- Blame: no localizado.
- Rebase visual interactivo: solo `pull --rebase`.
- `date-fns` citado en el README: no está en `apps/web/package.json`.
- Force-with-lease: no está en `SimpleGitAdapter.push`.

## Identidad (Fase 4) — siguiente listo del plan

| Slice | Estado en código |
|-------|------------------|
| 4.0 Cola, realpath, rate limit, auditoría, confirmación contextual | Disponible |
| 4.1 Preview HTTP merge/reset/cherry-pick/revert | Disponible en API; **UI no cableada**; rebase/force-push de preview **no** implementados en el use case |
| 4.2 Journal persistente + timeline + snapshots | Disponible |
| 4.3 Explain Mode | Planificado |
| 4.4 Grafo highlight / merge-base / camino | Planificado |
| 4.U UI/UX | Parcial (consola/operaciones); preview/explain/grafo pendientes |

## Superficie (Fase 5)

| Ítem | Estado |
|------|--------|
| Worktrees bajo `PROJECTS_ROOT` | Planificado |
| PR/MR como contexto de rama (badge en la rama actual) | Planificado (hoy hay modal de forjas, no contexto embebido en el grafo) |

## Plataforma (Fase 6)

| Ítem | Estado |
|------|--------|
| `docker-compose.prod.yml`, `DESPLIEGUE.md` | Planificado (hoy hay compose de desarrollo) |
| Usuarios/roles (Admin, Developer, Read-only) | Planificado, solo si hay LAN compartida real |
| Tauri | Opcional / planificado |
| Plugins sandbox | Último de Fase 6 |

## Forjas (GitHub / GitLab)

OAuth, listar/crear solicitudes, diff, checkout: **disponible** si hay `CLIENT_ID`/`SECRET`. Forja caída no bloquea Git local. Profundizar issues/boards/CI pixel-perfect: **fuera** del recorte de Fase 5.2.

## Fuera del norte cercano

IA / LLM, LFS, submódulos, GPG, GitKraken Cloud/Boards/Insights/Teams, hosting de repositorios. El plan (D26) no abre una fase de IA.

## Documento vivo

Cuando un slice se mergea, actualiza esta página y `docs/PLAN-TRABAJO.md`. Si discrepan, gana lo que hace el código.

## Siguiente

- [Home](./Home.md)
- [Plan de trabajo detallado](../PLAN-TRABAJO.md)

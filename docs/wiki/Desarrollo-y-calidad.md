# Desarrollo y calidad

Convenciones observadas en el repositorio y en `.cursor/rules`. No sustituyen al código.

## Gestor de paquetes

Solo **pnpm**. Lockfile `pnpm-lock.yaml`. CI: `pnpm install --frozen-lockfile`. `.npmrc`: `ignore-scripts=true`.

No introduzcas `package-lock.json` ni `yarn.lock`.

## Scripts reales (raíz)

| Script | Comando |
|--------|---------|
| `pnpm dev:server` | API con `tsx watch` |
| `pnpm dev:web` | Vite |
| `pnpm dev` | Ambos (Unix `&`) |
| `pnpm build` | `tsc` server + `tsc && vite build` web |
| `pnpm lint` | oxlint |
| `pnpm typecheck` | `tsc --noEmit` server + web |
| `pnpm test` | `vitest run` |
| `pnpm test:seguridad` | perímetro de refs, remotes, WS y validadores |
| `pnpm test:watch` | vitest |

CI (`.github/workflows/ci.yml`): typecheck → lint → test → test:seguridad → `pnpm audit --prod --audit-level high` → build. En PR: build de imágenes Docker + Trivy (fs, CRITICAL/HIGH). Dependabot abre PRs; **no** se auto-aceptan: cada uno debe pasar CI.

`pnpm audit --prod` (sin umbral) hoy reporta 2 *moderate* en `qs` transitivo de Express 4. No se sube Express en este ciclo. El gate de CI usa `--audit-level high` (flag oficial de pnpm) para no bloquear por avisos moderate no explotados en el modelo JSON de Abyssan.

## Arquitectura

Un camino Git. Un `HttpGitApi`. Envelope `{ exito, mensaje, datos, meta }` en `/api` (salvo `/health`). Nombres de negocio nuevos en español; términos Git en inglés cuando son estándar.

No añadir dependencias si el stack alcanza. Excepciones ya usadas: Shiki, virtualización del grafo (si está en componentes), Tailwind.

## Idioma

UI, toasts y mensajes al usuario en español. Esta wiki usa español de México.

## Pruebas observadas

Vitest en `apps/**/*.test.ts`. Cobertura notable:

- Validador de rutas y symlink.
- Flujo Daily Driver (repo temporal en `os.tmpdir()`).
- Journal persistente (restart, snapshot, traversal en manifiesto).
- Rate limit, token, envelope, forjas HTTP mockeadas.
- Auditoría JSONL sin tokens.
- Handshake WS (`AUTH` / `WATCH_REPO`), multiplex de watchers y fan-out `emitirARepo`.
- Preview no mutante y HEAD real (`rev-parse`, no `log --all`).

Las pruebas **no** deben usar remotos Git reales ni operar fuera de un `PROJECTS_ROOT` temporal. Para mutaciones destructivas, el patrón del repo es `fs.mkdtempSync` + `simpleGit().init()`.

`vitest.config.ts` fija `ABYSSAN_HOME` a un directorio temporal.

## Antes de integrar cambios

Recomendación alineada con CI (no hay hook de rama obligatorio en el código):

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:seguridad
pnpm build
```

## Secretos

No commitear `.env`, tokens, `ABYSSAN_SECRETO_CIFRADO`, ni dumps de journal con contenidos. `.gitignore` ignora `.env` y `dist`.

## Contratos HTTP

Un cambio de ruta o del envelope rompe `HttpGitApi`. Si mutas el contrato, actualiza cliente, tests y [Referencia-de-API.md](./Referencia-de-API.md) en el mismo cambio. No reintroduzcas `{ success, data }`.

## Operaciones Git

Toda mutación nueva: `IGitRepository` → `SimpleGitAdapter` → `GitUseCases` → `GitController` → ruta. Validar `repoPath`. Operaciones destructivas: confirmación contextual en UI; en Identidad, preview no mutante cuando aplique. No ejecutar Git con shell concatenado.

## Siguiente

- [Contribución](./Contribucion.md)
- [Roadmap](./Roadmap.md)
- [Home](./Home.md)

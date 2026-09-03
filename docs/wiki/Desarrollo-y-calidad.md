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
| `pnpm test` | `vitest run` |
| `pnpm test:watch` | vitest |

CI (`.github/workflows/ci.yml`): lint → test → build en Ubuntu, Node 22, pnpm 11.25.0, ramas `main`, `qa`, `dev` y pull requests.

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

Las pruebas **no** deben usar remotos Git reales ni operar fuera de un `PROJECTS_ROOT` temporal. Para mutaciones destructivas, el patrón del repo es `fs.mkdtempSync` + `simpleGit().init()`.

`vitest.config.ts` fija `ABYSSAN_HOME` a un directorio temporal.

## Antes de integrar cambios

Recomendación alineada con CI (no hay hook de rama obligatorio en el código):

```bash
pnpm lint
pnpm test
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

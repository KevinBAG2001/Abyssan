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

CI (`.github/workflows/ci.yml`), en push a `main`/`qa`/`dev` y en pull request. Permiso del workflow: `contents: read`. Actions externas fijadas por SHA (`checkout` v4.4.0, `setup-node` v4.4.0, `pnpm/action-setup` v4.3.0, `trivy-action` v0.36.0).

1. `verificar`: typecheck → lint → test → test:seguridad → audit → build.
2. `trivy-fs`: Trivy `scan-type: fs` sobre el checkout (CRITICAL/HIGH, `ignore-unfixed`).
3. `imagenes`: build etiquetado de las cuatro imágenes que ejecutan Compose (`abyssan-server:dev|prod`, `abyssan-web:dev|prod`) y Trivy `scan-type: image` sobre cada tag. `fail-fast: false`.

Dependabot (npm y github-actions, semanal) abre PRs; **no** se auto-aceptan: cada uno debe pasar CI. No hay CodeQL, dependency-review ni secret scanning en el workflow.

### Política de `pnpm audit`

- Bloquea el job: `pnpm audit --prod --audit-level high` (high/critical del árbol de producción).
- No bloquea: `pnpm audit --prod --audit-level moderate` (`continue-on-error`). Así un moderate de producción queda en el log y no pasa en silencio, pero no tumba CI sin un impacto demostrado en el runtime de Abyssan.
- Fuera de `--prod`: `vitest` / `@vitest/mocker` ([GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)), devDependency de la raíz. El fix publicado es `>=4.1.11` (salto mayor desde Vitest 3). No entra en las imágenes de producción del server (`pnpm install --prod`). Ver `DEP-VITEST-01`.

`qs` 6.15.3 ya no está en el árbol: Express `^4.22.3` resuelve 4.22.3 y el override `qs: '>=6.16.0'` fija la transitiva de `express` y `body-parser` en 6.16.0.

El scan de imagen sigue en `CRITICAL,HIGH` con `exit-code: 1`. No recorre dos rutas que no son el proceso de Abyssan: `/usr/local/lib/node_modules/npm` (npm del base image) y el binario de `esbuild@0.25.12` que instala Vite. El `node_modules` de la aplicación y los paquetes de Alpine sí bloquean el job. Ver `IMG-NPM-01` e `IMG-ESBUILD-01`.

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

# Registro de riesgos de seguridad

Fuente única de IDs. Un ID no puede estar a la vez “mitigado” y “abierto”.

Estados:

- **Mitigado** — hay control y evidencia (código + test).
- **Parcialmente mitigado** — el vector original se redujo, queda residuo documentado.
- **Abierto** — sin control suficiente.
- **Aceptado** — riesgo residual consciente, fuera de este ciclo o del modelo local.

## P0

Ninguno abierto en este ciclo.

| ID | Estado | Evidencia |
|----|--------|-----------|
| PREV-01 | Mitigado | Preview no mutante + `previewPerimetro.test.ts` |
| GRAPH-01 | Mitigado | HEAD real del grafo + tests de `grafo-utils` |

## P1

| ID | Estado | Qué se mitigó | Qué sigue abierto |
|----|--------|---------------|-------------------|
| SEC-REF-01 | Mitigado | `validarRefGit` / `validarHashGit` / `validarRefspecFetch` en use cases y controller | Contrato: no se aceptan `HEAD~1`, `HEAD^`, reflog |
| SEC-REM-01 | Mitigado | `RemotePolicy` revalida fetch/pull/push de remotos persistidos; bloquea `file://` | Un remoto peligroso puede existir en `.git/config`; Abyssan lo rechaza al usarlo, no lo borra solo |
| SEC-WS-01 | Parcialmente mitigado | `?token=` **no autentica**. Handshake `AUTH` o cookie de sesión. | El token permanente sigue existiendo en el servidor. Si alguien lo pega en una URL a mano, no se usa, pero el secreto de instancia sigue siendo de larga duración |
| SEC-WS-02 | Mitigado | Un watcher por repo, unwatch al último cliente, `UNWATCH` | — |
| SEC-WS-03 | Mitigado | `emitirARepo`; progreso no es broadcast global | — |
| SEC-VITE-01 | Mitigado | La SPA ya no lee `VITE_ABYSSAN_API_TOKEN`. Sesión HttpOnly + id en memoria | El operador sigue pegando el token permanente una vez en LAN/Docker |
| SEC-DKR-01 | Parcialmente mitigado | Prod: no-root, `safe.directory` explícito, sin wildcard. Dev: fallback root **solo** si el volumen Windows no es escribible | El compose de desarrollo puede seguir corriendo Git como root dentro del contenedor |
| CI-01 | Mitigado | typecheck, lint, test, test:seguridad, `pnpm audit --prod --audit-level high`, build; Trivy fs y Trivy image de las cuatro imágenes Compose, en push y PR; actions por SHA; `permissions: contents: read` | Dependabot no se auto-mergea. El scan de imagen omite el npm CLI de `node:22-alpine` y el binario de esbuild 0.25.12 (ver IMG-NPM-01, IMG-ESBUILD-01) |
| TEST-01 | Mitigado | Tests reales de WS (auth, Origin, cleanup, broadcast, reconnect) | — |
| OPS-01 | Parcialmente mitigado | Contrato + tests de `RepositoryOperationLock`. La cola in-process ya serializa por repo | El motor async/cancelación no está implementado |
| OPS-02 | Parcialmente mitigado | Contrato de recuperación documentado | No hay RecoveryManager |
| REC-01 | Parcialmente mitigado | Journal + snapshots en discard/reset hard | Pull/push/merge no tienen undo seguro |
| DEP-QS-01 | Mitigado | Express `^4.22.3` (resuelve 4.22.3) y override `qs: '>=6.16.0'`. `pnpm why` muestra una sola `qs@6.16.0` vía `express` y `body-parser`. `pnpm audit` ya no lista GHSA-x5fp-wj9c-mxmx ni GHSA-4mjr-xmp4-gh2g | — |
| DEP-VITEST-01 | Abierto (residual) | — | `vitest@3.2.7` y `@vitest/mocker`, GHSA-82fw-gwwq-j7x9 (moderate, solo dev). Parche publicado `>=4.1.11`. No está en el árbol `--prod` ni en la imagen de producción del server. El gate high de producción no lo ve a propósito |
| IMG-NPM-01 | Aceptado | — | Trivy image, run 35800627552: 11 HIGH/CRITICAL en `/usr/local/lib/node_modules/npm` (tar 7.5.11, brace-expansion 2.0.2, picomatch, pacote, sigstore, ip-address). Es el CLI de npm que trae `node:22-alpine`, no el `node_modules` de Abyssan. El server de producción ejecuta `node dist/index.js`. El workflow no escanea ese directorio |
| IMG-ESBUILD-01 | Aceptado | — | Trivy image: el binario `esbuild@0.25.12` (dependencia de Vite 6.4.3, Go 1.23.12) arrastra CVE de la stdlib de Go, entre ellos CVE-2025-68121. `esbuild@0.28.2` (tsx) no salió en ese informe. El API no ejecuta ese binario. El workflow no escanea esas dos rutas de pnpm hasta que Vite traiga un esbuild compilado con Go parcheado |

## Contradicción resuelta: SEC-WS-01

El ciclo anterior marcó SEC-WS-01 como mitigado (porque el handshake dejó de leer la query) y a la vez como abierto (porque `?token=` todavía podía aparecer en clientes o docs).

Hecho verificable ahora:

1. `adjuntarWebSocket` no lee `req.url` ni `?token=`.
2. En LAN, `?token=secreto` + `WATCH_REPO` cierra `4401` (`adjuntarWebSocket.test.ts`).
3. El cliente `websocket.ts` abre `ws://…` sin query.

Por eso el ID queda **parcialmente mitigado**: el vector de filtrado en logs/proxies por query string está cerrado; el token permanente de instancia no desapareció (se usa para abrir una sesión de corta duración).

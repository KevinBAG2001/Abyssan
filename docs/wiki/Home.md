# Abyssan

Documentación técnica del cliente Git gráfico **Abyssan**. Este Home es el índice de la wiki versionada en `docs/wiki/`.

Abyssan es un cliente Git **gráfico**, **local** y **autoalojable**. Un backend Node.js opera repositorios que viven en el disco de la máquina; una SPA React muestra el DAG, el staging y las mutaciones Git desde el navegador. **No** es un servicio de alojamiento de repositorios. **No** sustituye a GitHub, GitLab ni a un tablero de proyecto.

## Propósito

Hacer visible la historia (DAG), preparar el commit con diff y ejecutar flujos Git habituales **sobre repos que ya existen** bajo una raíz de filesystem (`PROJECTS_ROOT`), con validación de rutas y confirmación en la interfaz para varias operaciones destructivas.

## Problemas que busca resolver

- El `git log` lineal no muestra merges, HEAD y refs de un vistazo.
- Preparar un commit (`git add`, diff, mensaje) es fácil de equivocar en CLI.
- Un botón de merge o reset no explica el efecto antes de ejecutarlo (preview de Identidad: API disponible; la UI de preview **aún no está cableada** en componentes).
- Un reset o discard mal aplicado pierde trabajo local.

## Alcance actual (verificado en código)

Disponible en este repositorio:

- Listar, clonar e inicializar repositorios **dentro** de `PROJECTS_ROOT`.
- Status, grafo de commits, diff, stage/unstage **por archivo**, commit, checkout, ramas, tags, stash, remotos, fetch, pull (merge o rebase), push.
- Merge, abortar/continuar merge, cherry-pick, revert, reset, discard, amend, reflog.
- Conflictos 3-way (lectura y resolución de contenido).
- Journal persistente de undo y timeline en UI (Fase 4.2).
- Cola de operaciones, progreso por WebSocket, auditoría JSONL local.
- Preview HTTP no mutante para merge, reset, cherry-pick y revert.
- OAuth GitHub/GitLab y listado/creación de PR/MR (forjas), si hay credenciales.
- Token de instancia y rate limit cuando `BIND_HOST` no es loopback.

## Estado de madurez

El producto **no se declara estable para Internet**. El modelo de despliegue por defecto es **localhost** (`BIND_HOST=127.0.0.1`). `package.json` indica versión `1.0.0` y `"private": true`: no hay un proceso de release público documentado en el código.

Las fases 0–3 del plan (higiene, Daily Driver, power, forjas) están marcadas como cerradas en `docs/PLAN-TRABAJO.md`. Identidad (Fase 4) está **abierta**: 4.0–4.2 hechas en código; Explain Mode y grafo excepcional **pendientes**. Varias capacidades anunciadas en el README (blame, stage por hunk/línea, rebase interactivo, `date-fns`) **no aparecen** como módulos o rutas en el árbol actual.

## Tecnologías (comprobadas en `package.json`)

| Capa | Tecnología | Versión declarada |
|------|------------|-------------------|
| Monorepo | pnpm workspaces | CI y Docker: `pnpm@11.25.0` |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Lucide, Shiki | React `^19.0.0`, Vite `^6.2.0`, Tailwind `^4.0.9` |
| Backend | Node.js, Express, TypeScript, simple-git, ws, chokidar | Express `^4.21.2`, simple-git `^3.27.0` |
| Calidad | Vitest, oxlint | Vitest `^3.2.7` |
| Empaque | Docker Compose | Imágenes `node:22-alpine` |

No hay base de datos. Estado: memoria del proceso, `localStorage` en el cliente, archivos bajo el directorio de configuración de Abyssan (`~/.abyssan` o `ABYSSAN_HOME`).

## Advertencia

Algunas capacidades permanecen en desarrollo o están solo en el plan. **No** trates el roadmap como inventario de lo que ya corre. La fuente de verdad de rutas y comandos es el código (`GitRoutes.ts`, `package.json`) y esta wiki.

## Navegación

- [Instalación y configuración](./Instalacion-y-configuracion.md)
- [Arquitectura](./Arquitectura.md)
- [Operaciones Git](./Operaciones-Git.md)
- [Referencia de API](./Referencia-de-API.md)
- [Seguridad técnica](./Seguridad.md)
- [Desarrollo y calidad](./Desarrollo-y-calidad.md)
- [Despliegue con Docker](./Despliegue-con-Docker.md)
- [Roadmap](./Roadmap.md)
- [Solución de problemas](./Solucion-de-problemas.md)
- [Contribución](./Contribucion.md)

## Enlaces del repositorio

- [README principal](../../README.md)
- [Licencia MIT](../../LICENSE)
- [Política de reporte de vulnerabilidades](../../SECURITY.md)
- [Plan de trabajo](../PLAN-TRABAJO.md)

# WebKraken - Modern Web-based Git Client

WebKraken es un cliente grafico interactivo de Git para la web inspirado en GitKraken, construido con React 19, Vite 8, Tailwind CSS 4, Node.js y TypeScript.

## Documentación

- [PRD — Requisitos del producto](docs/PRD.md)
- [Plan de trabajo por fases](docs/PLAN-TRABAJO.md)
- [Prompt Request — brief de implementación](docs/PROMPT-REQUEST.md)

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

```bash
PROJECTS_ROOT=C:\Users\tu_usuario\proyectos
PORT=3001
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## Caracteristicas Principales

- Arbol de Commits DAG: Renderizado visual e interactivo de ramas con curvas Bezier, etiquetas de ramas y tags, autores y fechas.
- Area de Staging Interactiva: Separacion clara entre archivos Unstaged y Staged, con botones de stage individual o masivo.
- Syntax Diff Viewer: Visor de diferencias de codigo con resaltado de adiciones y eliminaciones.
- Sidebar de Ramas y Tags: Listado de ramas locales, remotas y tags con checkout instantaneo y creacion de nuevas referencias.
- Sincronizacion en Tiempo Real: WebSocket integrado con chokidar que actualiza la interfaz automaticamente cuando los archivos se modifican en el sistema.
- Acciones de Git: Commit, Push, Pull, Checkout, New Branch, New Tag, Stash, Cherry-Pick, Revert, Reset Soft/Hard, Resolucion de Conflictos 3-Way.
- Soporte Multi-Repositorio: Selector de repositorios locales en C:\Users\kevin.austria\proyectos.

---

## Stack Tecnologico

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide Icons, Date-fns.
- Backend: Node.js, Express, TypeScript, simple-git, ws (WebSockets), chokidar.
- DevOps: Docker y Docker Compose.
- Gestion de Paquetes: pnpm con configuracion de seguridad estricta (ignore-scripts=true).

---

## Como Ejecutar Localmente

### Opcion 1: Con pnpm (Recomendado para Desarrollo Rapido)

1. En la raiz del proyecto (C:\Users\kevin.austria\proyectos\webkraken):
   ```bash
   pnpm install
   ```

2. Iniciar el servidor backend:
   ```bash
   pnpm dev:server
   ```
   (El backend iniciara en http://localhost:3001 y WebSocket en ws://localhost:3001)

3. Iniciar la aplicacion web frontend:
   ```bash
   pnpm dev:web
   ```
   (Abre en tu navegador http://localhost:5174)

---

### Opcion 2: Con Docker Compose

Para ejecutar todo en contenedores aislados:

```bash
docker compose up --build
```

- Frontend: http://localhost:5174
- Backend API: http://localhost:3001

#!/usr/bin/env node
/**
 * Crea un repositorio de demo bajo `PROJECTS_ROOT` con historia suficiente
 * para que Abyssan tenga de qué pintar un grafo real:
 *
 *  - 20 commits en `main`.
 *  - Rama `feature/pagos` que se fusiona con merge-commit.
 *  - Rama `fix/choca-con-main` que modifica la misma línea que `main` y queda
 *    pendiente de merge (ideal para probar preview + conflicto).
 *  - Dos tags: `v0.1.0` sobre el merge-commit y `v0.2.0` sobre el final.
 *  - 1 archivo con cambio staged y 1 archivo con cambio unstaged, para que
 *    el panel de Staging no esté vacío.
 *
 * Uso:
 *   # Linux / macOS / Git Bash
 *   PROJECTS_ROOT=/ruta/a/proyectos node scripts/crear-repo-demo.mjs
 *
 *   # PowerShell
 *   $env:PROJECTS_ROOT = 'C:\Users\yo\proyectos'
 *   node scripts/crear-repo-demo.mjs [nombre] [--force]
 *
 * Opciones:
 *   nombre     Nombre del subdirectorio (default: `abyssan-demo`).
 *   --force    Sobreescribe un repo existente con ese nombre.
 *
 * El script NO opera fuera de `PROJECTS_ROOT`. Si intentas pasar un nombre
 * con separadores de ruta o `..` se rechaza. Sólo usa `git` del `PATH`
 * mediante `execFileSync` (sin shell), nunca `exec`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const projectsRoot = process.env.PROJECTS_ROOT;
if (!projectsRoot) {
  console.error('[abyssan-demo] PROJECTS_ROOT no está definido. Expórtalo antes de ejecutar.');
  process.exit(1);
}
if (!existsSync(projectsRoot)) {
  console.error(`[abyssan-demo] PROJECTS_ROOT no existe en disco: ${projectsRoot}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const nombreRepo = (args.find((a) => !a.startsWith('--')) || 'abyssan-demo').trim();

if (nombreRepo.includes('/') || nombreRepo.includes('\\') || nombreRepo.includes('..')) {
  console.error('[abyssan-demo] El nombre del repo no puede contener separadores de ruta ni «..».');
  process.exit(1);
}

const raizReal = resolve(projectsRoot);
const destino = resolve(join(raizReal, nombreRepo));
const dentroDeRaiz = destino === raizReal || destino.startsWith(raizReal + sep);
if (!dentroDeRaiz) {
  console.error(`[abyssan-demo] El destino quedaría fuera de PROJECTS_ROOT: ${destino}`);
  process.exit(1);
}

if (existsSync(destino)) {
  if (!force) {
    console.error(`[abyssan-demo] Ya existe ${destino}. Pasa --force para sobreescribir.`);
    process.exit(1);
  }
  rmSync(destino, { recursive: true, force: true });
}

mkdirSync(destino, { recursive: true });

/** Ejecuta `git <args>` dentro del repo demo, sin shell. */
function git(...gitArgs) {
  return execFileSync('git', gitArgs, {
    cwd: destino,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).toString();
}

/** Escribe `relPath` dentro del repo (crea subdirectorios si hace falta). */
function escribir(relPath, contenido) {
  const abs = join(destino, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contenido);
}

/**
 * Commit sintético: fija fecha y hora para que el grafo quede escalonado y
 * fácil de leer en capturas. `fechaIso` es ISO-8601 (sin ms).
 */
function commit(mensaje, fechaIso, archivos = {}) {
  for (const [ruta, contenido] of Object.entries(archivos)) {
    escribir(ruta, contenido);
  }
  git('add', '--all');
  const env = {
    ...process.env,
    GIT_AUTHOR_DATE: fechaIso,
    GIT_COMMITTER_DATE: fechaIso,
  };
  execFileSync('git', ['commit', '-m', mensaje, '--allow-empty'], {
    cwd: destino,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
}

const base = new Date('2026-09-01T09:00:00Z').getTime();
const fecha = (dia, hora = 10) => new Date(base + (dia - 1) * 86_400_000 + hora * 3_600_000).toISOString();

// ──────────────────────────────────────────────────────────────────────
// Setup inicial
// ──────────────────────────────────────────────────────────────────────
git('init', '--initial-branch=main');
git('config', 'user.email', 'demo@abyssan.dev');
git('config', 'user.name', 'Abyssan Demo');
git('config', 'commit.gpgsign', 'false');

// ──────────────────────────────────────────────────────────────────────
// 1..10 — base en `main`
// ──────────────────────────────────────────────────────────────────────
commit('chore: inicializar proyecto demo', fecha(1), {
  'README.md': '# Abyssan Demo\n\nProyecto sintético para probar el cliente.\n',
  '.gitignore': 'node_modules/\ndist/\n',
});

commit('feat(core): esqueleto de módulo principal', fecha(2), {
  'src/core/index.js': `export function hola(nombre) {\n  return 'Hola, ' + nombre;\n}\n`,
});

commit('feat(core): parser de notas simples', fecha(3), {
  'src/core/parser.js': `export function parsear(texto) {\n  return texto.split('\\n').filter(Boolean);\n}\n`,
});

commit('fix(core): tolerar entrada vacía en parser', fecha(4), {
  'src/core/parser.js': `export function parsear(texto) {\n  if (!texto) return [];\n  return texto.split('\\n').filter(Boolean);\n}\n`,
});

commit('docs: ampliar README con uso básico', fecha(5), {
  'README.md': '# Abyssan Demo\n\nProyecto sintético.\n\n## Uso\n\n```\nimport { hola } from "./src/core/index.js";\nhola("mundo");\n```\n',
});

commit('test(core): parser pasa casos nominales', fecha(6), {
  'test/parser.test.js': `import { parsear } from '../src/core/parser.js';\n\nif (parsear('a\\nb').length !== 2) throw new Error('fail');\n`,
});

commit('refactor(core): extraer utilidades comunes', fecha(7), {
  'src/core/util.js': `export const noVacio = (s) => Boolean(s && s.trim());\n`,
  'src/core/parser.js': `import { noVacio } from './util.js';\n\nexport function parsear(texto) {\n  if (!texto) return [];\n  return texto.split('\\n').filter(noVacio);\n}\n`,
});

commit('feat(cli): comando `generar`', fecha(8), {
  'src/cli/generar.js': `import { parsear } from '../core/parser.js';\n\nexport function generar(entrada) {\n  return parsear(entrada).map((l) => '- ' + l);\n}\n`,
});

commit('fix(cli): soportar flags repetidos sin romper', fecha(9), {
  'src/cli/generar.js': `import { parsear } from '../core/parser.js';\n\nexport function generar(entrada, flags = []) {\n  const unicos = Array.from(new Set(flags));\n  return parsear(entrada).map((l) => (unicos.includes('--marcar') ? '[ ] ' : '- ') + l);\n}\n`,
});

commit('docs(cli): añadir ejemplos de uso del CLI', fecha(10), {
  'docs/cli.md': '# CLI\n\n```\ngenerar --marcar < notas.txt\n```\n',
});

// ──────────────────────────────────────────────────────────────────────
// 11..13 — rama feature/pagos
// ──────────────────────────────────────────────────────────────────────
git('checkout', '-b', 'feature/pagos');

commit('feat(pagos): endpoint POST /pagos', fecha(11), {
  'src/pagos/endpoint.js': `export async function pagar(req) {\n  return { id: req.id, estado: 'ok' };\n}\n`,
});

commit('test(pagos): captura happy path', fecha(12), {
  'test/pagos.test.js': `import { pagar } from '../src/pagos/endpoint.js';\n\nconst res = await pagar({ id: 'p1' });\nif (res.estado !== 'ok') throw new Error('fail');\n`,
});

commit('docs(pagos): describir contrato público', fecha(13), {
  'docs/pagos.md': '# Pagos\n\n`POST /pagos` recibe `{ id }` y devuelve `{ id, estado }`.\n',
});

// ──────────────────────────────────────────────────────────────────────
// 14..15 — vuelta a `main` con cambios paralelos
// ──────────────────────────────────────────────────────────────────────
git('checkout', 'main');

commit('feat(api): autenticación básica tipo Bearer', fecha(14), {
  'src/api/auth.js': `export function validar(token) {\n  return token && token.startsWith('abyssan_');\n}\n`,
});

commit('chore(deps): fijar versiones de utilidades', fecha(15), {
  'package.json': `{\n  "name": "abyssan-demo",\n  "version": "0.0.1",\n  "type": "module",\n  "private": true\n}\n`,
});

// ──────────────────────────────────────────────────────────────────────
// 16 — merge feature/pagos → main con no-ff
// ──────────────────────────────────────────────────────────────────────
execFileSync(
  'git',
  ['merge', '--no-ff', '-m', 'Merge branch "feature/pagos" en main', 'feature/pagos'],
  {
    cwd: destino,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: fecha(16),
      GIT_COMMITTER_DATE: fecha(16),
    },
  },
);

// Tag anotado sobre el merge-commit
execFileSync('git', ['tag', '-a', 'v0.1.0', '-m', 'Primer release con pagos'], {
  cwd: destino,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    GIT_AUTHOR_DATE: fecha(16, 11),
    GIT_COMMITTER_DATE: fecha(16, 11),
  },
});

// ──────────────────────────────────────────────────────────────────────
// 17..20 — refinamiento en `main`
// ──────────────────────────────────────────────────────────────────────
commit('fix(pagos): rechazar importes negativos', fecha(17), {
  'src/pagos/endpoint.js': `export async function pagar(req) {\n  if (typeof req.monto === 'number' && req.monto < 0) {\n    throw new Error('monto inválido');\n  }\n  return { id: req.id, estado: 'ok' };\n}\n`,
});

commit('feat(api): marcar versión v1 en el handshake', fecha(18), {
  'src/api/version.js': `export const VERSION = 'v1';\n`,
});

commit('docs: notas de release v0.2.0', fecha(19), {
  'CHANGELOG.md': '# Changelog\n\n## v0.2.0\n\n- Pagos con validación de importes.\n- Handshake con versión v1.\n',
});

commit('feat(core): soporte experimental multi-tenant', fecha(20), {
  'src/core/tenant.js': `export function enContexto(tenant, fn) {\n  const anterior = globalThis.__ABYSSAN_TENANT__;\n  globalThis.__ABYSSAN_TENANT__ = tenant;\n  try {\n    return fn();\n  } finally {\n    globalThis.__ABYSSAN_TENANT__ = anterior;\n  }\n}\n`,
});

// Tag anotado sobre el commit final de main
execFileSync('git', ['tag', '-a', 'v0.2.0', '-m', 'Release con multi-tenant experimental'], {
  cwd: destino,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    GIT_AUTHOR_DATE: fecha(20, 12),
    GIT_COMMITTER_DATE: fecha(20, 12),
  },
});

// ──────────────────────────────────────────────────────────────────────
// Rama fix/choca-con-main — modifica la misma línea que el commit 20
// ──────────────────────────────────────────────────────────────────────
git('checkout', '-b', 'fix/choca-con-main', 'main~1'); // desde antes del commit 20

commit('fix(core): tenant explícito en firma pública (choca con main)', fecha(21), {
  'src/core/tenant.js': `export function enContexto(tenantId, callback) {\n  if (!tenantId) throw new Error('tenantId requerido');\n  const anterior = globalThis.__ABYSSAN_TENANT__;\n  globalThis.__ABYSSAN_TENANT__ = tenantId;\n  try {\n    return callback();\n  } finally {\n    globalThis.__ABYSSAN_TENANT__ = anterior;\n  }\n}\n`,
});

// ──────────────────────────────────────────────────────────────────────
// Vuelta a main, dejar staged + unstaged
// ──────────────────────────────────────────────────────────────────────
git('checkout', 'main');

// Cambio staged
escribir('CHANGELOG.md', '# Changelog\n\n## v0.3.0 (en progreso)\n\n- Multi-tenant estable.\n\n## v0.2.0\n\n- Pagos con validación de importes.\n- Handshake con versión v1.\n');
git('add', 'CHANGELOG.md');

// Cambio unstaged
escribir(
  'README.md',
  '# Abyssan Demo\n\nProyecto sintético para probar Abyssan.\n\n## Uso\n\n```\nimport { hola } from "./src/core/index.js";\nhola("mundo");\n```\n\nEditado en working tree sin stage para que Abyssan lo muestre en Sin preparar.\n',
);

console.log(`\n[abyssan-demo] Repo listo en ${destino}`);
console.log('[abyssan-demo] Ramas: main, feature/pagos (merged), fix/choca-con-main');
console.log('[abyssan-demo] Tags:  v0.1.0 (sobre merge), v0.2.0 (sobre HEAD)');
console.log('[abyssan-demo] Staging: CHANGELOG.md staged, README.md unstaged');
console.log('[abyssan-demo] Para probar en Abyssan abre http://localhost:5174 y selecciona este repo.\n');

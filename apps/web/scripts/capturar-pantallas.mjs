#!/usr/bin/env node
/**
 * Capturas reales del grafo y del preview de merge para el README.
 *
 * Precondiciones (en orden):
 *   1. `pnpm demo:repo` ya se ejecutó (existe `abyssan-demo` bajo PROJECTS_ROOT
 *      con `main`, `feature/pagos` fusionada y `fix/choca-con-main` por fusionar).
 *   2. `pnpm dev` corriendo: API en :3001 y SPA en :5174.
 *   3. Chromium instalado para Playwright:
 *          pnpm --filter @abyssan/web exec playwright install chromium
 *      (hace falta la primera vez; el `.npmrc` de la raíz tiene
 *      `ignore-scripts=true`, así que el postinstall de Playwright no corre).
 *
 * Lo que hace:
 *   - Abre Chromium headless a 1280×800.
 *   - Entra a http://localhost:5174, descarta modales de sesión si aparecen.
 *   - Selecciona el repo demo (`DEMO_REPO`, default `abyssan-demo`).
 *   - Captura el grafo completo en `assets/capturas/grafo.png`.
 *   - Abre el modal de comparar ramas, elige main (base) y
 *     fix/choca-con-main (origen), lanza el preview de merge.
 *   - Captura el modal de preview en `assets/capturas/preview-merge.png`.
 *
 * No modifica el repo: el preview es no mutante y se cancela al terminar.
 *
 * Uso:
 *   pnpm --filter @abyssan/web capturas
 *   # o con repo distinto:
 *   DEMO_REPO=mi-demo pnpm --filter @abyssan/web capturas
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aquí = dirname(fileURLToPath(import.meta.url));
const raizRepo = resolve(aquí, '..', '..', '..');
const salidaGrafo = resolve(raizRepo, 'assets', 'capturas', 'grafo.png');
const salidaPreview = resolve(raizRepo, 'assets', 'capturas', 'preview-merge.png');

const BASE_URL = process.env.ABYSSAN_URL ?? 'http://localhost:5174';
const DEMO_REPO = process.env.DEMO_REPO ?? 'abyssan-demo';
const RAMA_ORIGEN = process.env.DEMO_RAMA_ORIGEN ?? 'fix/choca-con-main';
const RAMA_BASE = process.env.DEMO_RAMA_BASE ?? 'main';
const TIMEOUT_SPA = Number(process.env.DEMO_TIMEOUT_MS ?? 15_000);

function log(mensaje) {
  console.log(`[capturas] ${mensaje}`);
}

async function esperarApi() {
  const url = `${BASE_URL.replace(/\/$/, '')}/`;
  const inicio = Date.now();
  while (Date.now() - inicio < TIMEOUT_SPA) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (r.ok || r.status === 304) return;
    } catch {
      // reintenta
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `No se pudo contactar ${url} tras ${TIMEOUT_SPA} ms. ¿Está "pnpm dev" corriendo?`,
  );
}

async function dismissSesionModalSiAplica(page) {
  // En localhost normalmente no hace falta token. Si por configuración apareciera
  // el modal de sesión, cerramos para no bloquear la captura.
  const modal = page.locator('text=Introduce el token de instancia').first();
  if (await modal.isVisible().catch(() => false)) {
    log('Modal de sesión visible; se intenta cerrar con Escape.');
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function seleccionarRepoDemo(page) {
  await page.waitForSelector('#selector-repo', { timeout: TIMEOUT_SPA });
  const select = page.locator('#selector-repo');
  const opciones = await select.locator('option').allTextContents();
  const encaja = opciones.find((o) => o.startsWith(DEMO_REPO));
  if (!encaja) {
    throw new Error(
      `El selector no muestra «${DEMO_REPO}». Opciones vistas: ${opciones.join(', ')}. ` +
        'Asegúrate de haber corrido `pnpm demo:repo` y que PROJECTS_ROOT apunte a esa carpeta.',
    );
  }
  // El value del <option> es la ruta absoluta del repo; seleccionamos por label.
  await select.selectOption({ label: encaja });
  // Esperar a que el grafo aparezca
  await page.waitForSelector('[data-testid="commit-graph"], .commit-graph, svg', {
    timeout: TIMEOUT_SPA,
  });
  await page.waitForTimeout(800); // asentar layout + highlighter de Shiki
}

async function capturarGrafo(page) {
  await mkdir(dirname(salidaGrafo), { recursive: true });
  await page.screenshot({ path: salidaGrafo, fullPage: false });
  log(`Grafo guardado en ${salidaGrafo}`);
}

async function abrirPreviewMerge(page) {
  const botonCompare = page.getByTitle('Comparar ramas y merge');
  await botonCompare.click({ timeout: TIMEOUT_SPA });

  await page.waitForSelector('#rama-base', { timeout: TIMEOUT_SPA });
  await page.locator('#rama-base').selectOption({ label: RAMA_BASE });
  await page.locator('#rama-origen').selectOption({ label: RAMA_ORIGEN });

  // Esperar a que termine la comparación (botón se habilita)
  const botonFusionar = page.getByRole('button', { name: new RegExp(`Fusionar en ${RAMA_BASE}`) });
  await botonFusionar.waitFor({ state: 'visible', timeout: TIMEOUT_SPA });
  // Esperar a que no esté deshabilitado
  await page
    .waitForFunction(
      (nombre) => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes(`Fusionar en ${nombre}`),
        );
        return btn && !btn.hasAttribute('disabled');
      },
      RAMA_BASE,
      { timeout: TIMEOUT_SPA },
    )
    .catch(() => undefined);

  await botonFusionar.click({ timeout: TIMEOUT_SPA });

  // El modal de preview aparece con h2 "Fusionar ..."
  const titulo = page.locator('#titulo-confirmacion');
  await titulo.waitFor({ state: 'visible', timeout: TIMEOUT_SPA });
  await page.waitForTimeout(400); // asentar animación y preview async
}

async function capturarPreview(page) {
  await mkdir(dirname(salidaPreview), { recursive: true });
  const dialogo = page.getByRole('dialog').last();
  await dialogo.screenshot({ path: salidaPreview });
  log(`Preview guardado en ${salidaPreview}`);
  // Cancelar para no mutar nada por accidente
  const cancelar = page.getByRole('button', { name: 'Cancelar' }).last();
  await cancelar.click({ timeout: TIMEOUT_SPA }).catch(() => undefined);
}

async function main() {
  log(`Verificando que ${BASE_URL} responda…`);
  await esperarApi();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    log(`Abriendo ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissSesionModalSiAplica(page);

    log(`Seleccionando repo demo «${DEMO_REPO}»`);
    await seleccionarRepoDemo(page);

    log('Capturando grafo');
    await capturarGrafo(page);

    log(`Abriendo preview de merge ${RAMA_ORIGEN} → ${RAMA_BASE}`);
    await abrirPreviewMerge(page);

    log('Capturando preview de merge');
    await capturarPreview(page);

    log('Capturas listas. Nada mutado en el repo.');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[capturas] Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

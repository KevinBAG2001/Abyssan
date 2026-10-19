#!/usr/bin/env node
/**
 * Verifica anchos del inspector y modales (regresión D1: tokens --spacing-* vs max-w-*).
 *
 * Uso:
 *   ABYSSAN_URL=http://127.0.0.1:5174 node apps/web/scripts/qa-spacing-layout.mjs
 *   CAPTURAS_DIR=docs/qa/d1-spacing-fix/before node apps/web/scripts/qa-spacing-layout.mjs --screenshots
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = process.env.ABYSSAN_URL ?? 'http://127.0.0.1:5174';
const DEMO_REPO = process.env.DEMO_REPO ?? 'abyssan-demo';
const CAPTURAS_DIR = process.env.CAPTURAS_DIR ?? '';
const soloCapturas = process.argv.includes('--screenshots');
const MIN_INSPECTOR_W = Number(process.env.MIN_INSPECTOR_W ?? 200);

async function seleccionarRepo(page) {
  await page.waitForSelector('#selector-repo', { timeout: 20_000 });
  const select = page.locator('#selector-repo');
  const opciones = await select.locator('option').allTextContents();
  const encaja = opciones.find((o) => o.startsWith(DEMO_REPO));
  if (!encaja) {
    throw new Error(`Repo «${DEMO_REPO}» no encontrado. Opciones: ${opciones.join(', ')}`);
  }
  await select.selectOption({ label: encaja });
  await page.waitForTimeout(1200);
}

async function abrirInspector(page) {
  await page.locator('button[data-commit]').first().waitFor({ state: 'attached', timeout: 20_000 });
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-commit]');
    btn?.click();
  });
  await page.waitForSelector('[aria-labelledby="titulo-inspector-commit"], aside[aria-labelledby=titulo-inspector-commit]', {
    timeout: 10_000,
  });
  await page.waitForTimeout(400);
}

function medirInspector(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('aside[aria-labelledby="titulo-inspector-commit"]');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    const cs = getComputedStyle(panel);
    return { width: r.width, maxWidth: cs.maxWidth };
  });
}

async function cerrarInspectorSiAbierto(page) {
  const panel = page.locator('aside[aria-labelledby="titulo-inspector-commit"]');
  if (!(await panel.count())) return;
  await page.evaluate(() => {
    document.querySelector('[aria-label="Cerrar inspector"]')?.click();
  });
  await panel.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(200);
}

async function abrirModalCaptura(page) {
  await cerrarInspectorSiAbierto(page);
  const stash = page.locator('button[title="Gestor de stash"]');
  if (await stash.isVisible().catch(() => false)) {
    await stash.click();
  } else {
    await page.locator('button[title="Identidad git"]').click();
  }
  await page.waitForSelector('dialog[open]', { timeout: 8_000 });
  await page.waitForTimeout(400);
}

function medirModalStash(page) {
  return page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    if (!d) return null;
    const c = d.lastElementChild;
    const cs = c ? getComputedStyle(c) : null;
    const rc = c?.getBoundingClientRect();
    return {
      dialogW: d.getBoundingClientRect().width,
      contW: rc?.width ?? 0,
      maxW: cs?.maxWidth ?? '',
    };
  });
}

async function capturarViewport(browser, outDir, label, w, h, conModal) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE_URL);
  await seleccionarRepo(page);
  await abrirInspector(page);
  if (conModal) {
    await abrirModalCaptura(page);
  }
  const path = resolve(outDir, `${label}-${w}x${h}.png`);
  await page.screenshot({ path, fullPage: false });
  await page.close();
  return path;
}

async function main() {
  const browser = await chromium.launch();
  const resultados = { viewports: {}, ok: true };

  for (const [w, h] of [
    [1280, 800],
    [1920, 1080],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE_URL);
    await seleccionarRepo(page);
    await abrirInspector(page);
    const insp = await medirInspector(page);
    await abrirModalCaptura(page);
    const modal = await medirModalStash(page);
    await page.close();

    const inspOk = insp && insp.width > MIN_INSPECTOR_W;
    const modalOk = modal && modal.contW >= 320;
    if (!soloCapturas && (!inspOk || !modalOk)) resultados.ok = false;

    resultados.viewports[`${w}x${h}`] = { inspector: insp, modal, inspOk, modalOk };
    console.log(JSON.stringify({ viewport: `${w}x${h}`, inspector: insp, modal, inspOk, modalOk }, null, 2));
  }

  if (CAPTURAS_DIR) {
    await mkdir(CAPTURAS_DIR, { recursive: true });
    for (const [w, h] of [
      [393, 852],
      [1280, 800],
    ]) {
      await capturarViewport(browser, CAPTURAS_DIR, 'inspector', w, h, false);
      await capturarViewport(browser, CAPTURAS_DIR, 'inspector-modal-stash', w, h, true);
    }
  }

  await browser.close();

  if (!soloCapturas && !resultados.ok) {
    console.error(`[qa-spacing] Fallo: inspector debe ser > ${MIN_INSPECTOR_W}px y modal >= 320px`);
    process.exit(1);
  }
  console.log('[qa-spacing] OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

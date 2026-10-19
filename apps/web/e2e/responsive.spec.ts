import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VIEWPORTS = [
  { width: 393, height: 852 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

function projectsRoot(): string {
  const root = process.env.PROJECTS_ROOT;
  if (!root) throw new Error('PROJECTS_ROOT debe estar definido para e2e responsivo');
  return root;
}

function rutaDemo(): string {
  const nombre = process.env.DEMO_REPO ?? 'abyssan-demo';
  return join(projectsRoot(), nombre);
}

async function seleccionarDemo(page: Page) {
  await page.goto('/');
  await page.waitForSelector('#selector-repo', { timeout: 30_000 });
  const ruta = rutaDemo();
  if (!existsSync(ruta)) {
    throw new Error(`No existe el repo demo en ${ruta}. Ejecuta pnpm demo:repo antes.`);
  }
  const valor = await page.locator('#selector-repo').inputValue();
  if (valor !== ruta) {
    await page.selectOption('#selector-repo', ruta);
  }
  await page.waitForTimeout(1500);
}

async function metricas(page: Page) {
  return page.evaluate(() => {
    const W = window.innerWidth;
    const docOverflow = document.documentElement.scrollWidth - W;
    const main = [...document.querySelectorAll('main[data-testid="abyssan-main"]')].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const mainRect = main?.getBoundingClientRect();
    const mainVisibleW =
      mainRect && mainRect.width > 0
        ? Math.max(0, Math.min(mainRect.right, W) - Math.max(mainRect.left, 0))
        : 0;
    const mainH = mainRect?.height ?? 0;
    const sel = document.querySelector('#selector-repo');
    const selRect = sel?.getBoundingClientRect();
    let selectorTapable = false;
    if (selRect && selRect.width > 0 && selRect.height > 0) {
      const cx = selRect.left + selRect.width / 2;
      const cy = selRect.top + selRect.height / 2;
      const top = document.elementFromPoint(cx, cy);
      selectorTapable = top === sel || sel?.contains(top ?? null);
    }
    return {
      docOverflow,
      mainVisibleW: Math.round(mainVisibleW),
      mainH: Math.round(mainH),
      selectorW: Math.round(selRect?.width ?? 0),
      selectorH: Math.round(selRect?.height ?? 0),
      selectorTapable,
    };
  });
}

test.describe('layout responsivo con repo demo', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      const hasTouch = vp.width < 1024;
      if (hasTouch) {
        await page.context().addInitScript(() => {
          Object.defineProperty(window.navigator, 'maxTouchPoints', { get: () => 5 });
        });
      }
      await seleccionarDemo(page);
      const m = await metricas(page);
      expect(m.docOverflow, 'sin desborde horizontal de página').toBeLessThanOrEqual(1);
      expect(m.mainVisibleW, 'ancho visible del panel central').toBeGreaterThanOrEqual(280);
      expect(m.mainH, 'altura del panel central').toBeGreaterThan(120);
      expect(m.selectorW, 'selector de repo visible').toBeGreaterThan(32);
      expect(m.selectorH, 'selector de repo visible').toBeGreaterThan(20);
      expect(m.selectorTapable, 'selector no tapado por otros elementos').toBe(true);

      const push = page.locator('button[title*="Enviar"]').first();
      await expect(push).toBeVisible();
      const pushBox = await push.boundingBox();
      expect(pushBox?.width ?? 0).toBeGreaterThan(0);
      expect(pushBox?.height ?? 0).toBeGreaterThan(0);
    });
  }

  test('menú overflow abre stash en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await seleccionarDemo(page);
    await page.getByRole('button', { name: 'Más acciones' }).click();
    await page.getByRole('menuitem', { name: 'Stash' }).click();
    const panel = page.locator('dialog[open] >> div.relative').first();
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(120);
  });
});

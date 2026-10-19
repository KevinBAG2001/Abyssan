import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || '/opt/cursor/artifacts/screenshots/after';
const baseURL = process.env.ABYSSAN_URL ?? 'http://127.0.0.1:5174';
const projectsRoot = process.env.PROJECTS_ROOT;
if (!projectsRoot) {
  console.error('PROJECTS_ROOT requerido');
  process.exit(1);
}
const demoPath = join(projectsRoot, process.env.DEMO_REPO ?? 'abyssan-demo');

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [w, h, tag] of [
  [393, 852, '393x852'],
  [1280, 800, '1280x800'],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(baseURL);
  await page.waitForSelector('#selector-repo');
  await page.selectOption('#selector-repo', demoPath);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(outDir, `grafo-${tag}.png`), fullPage: false });
  const stashBtn = page.locator('button[title="Gestor de stash"]');
  const visible = await stashBtn.first().isVisible().catch(() => false);
  if (visible) {
    await stashBtn.first().click();
  } else {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await stashBtn.first().click();
    await page.setViewportSize({ width: w, height: h });
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(outDir, `modal-stash-${tag}.png`), fullPage: false });
  await ctx.close();
}
await browser.close();
console.log('Capturas en', outDir);

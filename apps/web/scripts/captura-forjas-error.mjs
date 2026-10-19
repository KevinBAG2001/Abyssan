import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.OUT || '/opt/cursor/artifacts';
const URL = process.env.URL || 'http://127.0.0.1:5174/';
const TAG = process.env.TAG || 'despues';

fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { w: 393, h: 852, name: '393x852' },
  { w: 1280, h: 800, name: '1280x800' },
];

async function abrirForjas(p) {
  const btn = p.locator('button[title="PRs y MRs"]');
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    return;
  }
  await p.keyboard.press('Control+Shift+KeyP');
  await p.waitForSelector('#paleta-filtro', { timeout: 10_000 });
  await p.locator('#paleta-filtro').fill('PRs');
  await p.keyboard.press('Enter');
}

const b = await chromium.launch();
for (const vp of viewports) {
  const p = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
  await p.goto(URL);
  await p.waitForSelector('#selector-repo', { timeout: 60_000 });
  await p.waitForTimeout(1500);
  const opts = await p.locator('#selector-repo option').allTextContents();
  const label = opts.find((t) => t.includes('forjas-qa')) || opts.find((t) => t.includes('qa')) || opts[1];
  if (label) await p.selectOption('#selector-repo', { label });
  await p.waitForTimeout(2000);
  await abrirForjas(p);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(OUT, `${TAG}-forjas-error-${vp.name}.png`), fullPage: false });
  await p.close();
}
await b.close();
console.log('capturas en', OUT, 'prefijo', TAG);

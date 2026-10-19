import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const raizWeb = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = resolve(raizWeb, 'scripts', 'qa-spacing-layout.mjs');

const e2eActivo = process.env.ABYSSAN_E2E === '1';

describe.skipIf(!e2eActivo)('layout D1 — inspector y modales (Playwright)', () => {
  it('el inspector supera 200 px en 1280×800 y 1920×1080', async () => {
    const { stdout } = await execFileAsync(process.execPath, [script], {
      cwd: raizWeb,
      env: {
        ...process.env,
        ABYSSAN_URL: process.env.ABYSSAN_URL ?? 'http://127.0.0.1:5174',
        MIN_INSPECTOR_W: '200',
      },
      timeout: 120_000,
    });
    expect(stdout).toContain('[qa-spacing] OK');
  }, 130_000);
});

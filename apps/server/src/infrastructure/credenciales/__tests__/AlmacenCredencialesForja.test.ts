import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AlmacenCredencialesForja } from '../AlmacenCredencialesForja.js';

describe('AlmacenCredencialesForja', () => {
  const homeOriginal = process.env.ABYSSAN_HOME;
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-cred-'));
    process.env.ABYSSAN_HOME = dir;
  });

  afterEach(() => {
    if (homeOriginal !== undefined) process.env.ABYSSAN_HOME = homeOriginal;
    else delete process.env.ABYSSAN_HOME;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('persiste en ABYSSAN_HOME y no expone el token en listarPublico (SEC-003)', () => {
    const almacen = new AlmacenCredencialesForja();
    almacen.guardar({ proveedor: 'github', token: 'gho_falsoNoUsar', usuario: 'demo' });
    expect(fs.existsSync(path.join(dir, 'credenciales.enc'))).toBe(true);
    const publico = almacen.listarPublico();
    expect(publico).toEqual([{ proveedor: 'github', usuario: 'demo' }]);
    expect(JSON.stringify(publico)).not.toContain('gho_falsoNoUsar');
  });
});

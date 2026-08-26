import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  auditoriaJsonl,
  obtenerRutaAuditoria,
  sanitizarTextoAuditoria,
} from '../AuditoriaJsonlAdapter.js';

describe('auditoría jsonl', () => {
  const homeOriginal = process.env.ABYSSAN_HOME;
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-aud-'));
    process.env.ABYSSAN_HOME = dir;
  });

  afterEach(() => {
    if (homeOriginal !== undefined) process.env.ABYSSAN_HOME = homeOriginal;
    else delete process.env.ABYSSAN_HOME;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('escribe una línea sin diffs ni tokens', () => {
    auditoriaJsonl.registrar({
      tipo: 'clone',
      repo: 'https://x-access-token:gho_secreto@github.com/org/repo.git',
      estado: 'exito',
      duracionMs: 12,
      error: 'Bearer gho_secreto falló',
    });
    const bruto = fs.readFileSync(obtenerRutaAuditoria(), 'utf8');
    expect(bruto).not.toContain('gho_secreto');
    expect(bruto).not.toContain('x-access-token');
    const linea = JSON.parse(bruto.trim()) as { tipo: string; estado: string };
    expect(linea.tipo).toBe('clone');
    expect(linea.estado).toBe('exito');
  });

  it('sanitizarTextoAuditoria recorta secretos', () => {
    const limpio = sanitizarTextoAuditoria('Authorization Bearer gho_abc clone https://user:token@host/a.git');
    expect(limpio).not.toMatch(/gho_abc/);
    expect(limpio).not.toContain('user:token@');
  });
});

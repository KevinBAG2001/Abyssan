import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type EntradaAuditoria = {
  ts: string;
  tipo: string;
  repo: string;
  estado: 'exito' | 'fallo';
  duracionMs?: number;
  error?: string;
};

import { sanitizarTextoAuditoria } from '../seguridad/sanitizarSecretosGit.js';

export { sanitizarTextoAuditoria };

export function obtenerDirAbyssan(): string {
  if (process.env.ABYSSAN_HOME?.trim()) {
    return path.resolve(process.env.ABYSSAN_HOME.trim());
  }
  return path.join(os.homedir(), '.abyssan');
}

export function obtenerRutaAuditoria(): string {
  return path.join(obtenerDirAbyssan(), 'auditoria.jsonl');
}

export class AuditoriaJsonlAdapter {
  registrar(entrada: Omit<EntradaAuditoria, 'ts'> & { ts?: string }): void {
    const linea: EntradaAuditoria = {
      ts: entrada.ts ?? new Date().toISOString(),
      tipo: entrada.tipo,
      repo: sanitizarTextoAuditoria(entrada.repo),
      estado: entrada.estado,
      duracionMs: entrada.duracionMs,
      error: entrada.error ? sanitizarTextoAuditoria(entrada.error) : undefined,
    };
    const dir = obtenerDirAbyssan();
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(obtenerRutaAuditoria(), `${JSON.stringify(linea)}\n`, 'utf8');
  }
}

export const auditoriaJsonl = new AuditoriaJsonlAdapter();

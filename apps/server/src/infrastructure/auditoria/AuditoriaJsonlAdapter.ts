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

const TOKEN_EN_URL = /https?:\/\/[^/\s]*:[^/\s]+@/gi;
const PATRON_TOKEN = /(bearer\s+|token[=:]\s*|gho_|glpat-|github_pat_)[^\s"']+/gi;

export function sanitizarTextoAuditoria(texto: string): string {
  return texto
    .replace(TOKEN_EN_URL, 'https://***@')
    .replace(PATRON_TOKEN, '[redactado]')
    .slice(0, 400);
}

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

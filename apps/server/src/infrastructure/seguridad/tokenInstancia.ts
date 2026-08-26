import type { IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const HOSTS_LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

export function obtenerBindHost(): string {
  return process.env.BIND_HOST?.trim() || '127.0.0.1';
}

export function esBindLoopback(host = obtenerBindHost()): boolean {
  return HOSTS_LOOPBACK.has(host.toLowerCase());
}

export function tokenLanEsObligatorio(host = obtenerBindHost()): boolean {
  return !esBindLoopback(host);
}

export function validarConfiguracionToken(): void {
  if (tokenLanEsObligatorio() && !process.env.ABYSSAN_API_TOKEN?.trim()) {
    throw new Error(
      'ABYSSAN_API_TOKEN es obligatorio cuando BIND_HOST no es loopback. Define el token o usa BIND_HOST=127.0.0.1'
    );
  }
}

export function extraerTokenBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const [tipo, valor] = header.split(/\s+/);
  if (tipo?.toLowerCase() !== 'bearer' || !valor) return undefined;
  return valor;
}

export function extraerTokenDesdeUrl(urlCruda?: string): string | undefined {
  if (!urlCruda) return undefined;
  try {
    const url = new URL(urlCruda, 'http://abyssan.local');
    return url.searchParams.get('token') || undefined;
  } catch {
    return undefined;
  }
}

function tokensIguales(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tokenEsValido(token?: string | null): boolean {
  if (!tokenLanEsObligatorio()) return true;
  const esperado = process.env.ABYSSAN_API_TOKEN?.trim();
  if (!esperado || !token) return false;
  return tokensIguales(token, esperado);
}

export function conexionWsAutorizada(req: IncomingMessage): boolean {
  if (!tokenLanEsObligatorio()) return true;
  return tokenEsValido(extraerTokenDesdeUrl(req.url));
}

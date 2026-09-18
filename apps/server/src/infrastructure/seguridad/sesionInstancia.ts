import { randomBytes, timingSafeEqual } from 'node:crypto';

export const NOMBRE_COOKIE_SESION = 'abyssan_sesion';
export const TTL_SESION_MS = 12 * 60 * 60 * 1000;

type EntradaSesion = {
  id: string;
  creada: number;
  expira: number;
};

const sesiones = new Map<string, EntradaSesion>();

function idsIguales(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function crearSesion(ahora = Date.now()): EntradaSesion {
  const id = randomBytes(32).toString('hex');
  const entrada: EntradaSesion = {
    id,
    creada: ahora,
    expira: ahora + TTL_SESION_MS,
  };
  sesiones.set(id, entrada);
  return entrada;
}

export function sesionEsValida(id?: string | null, ahora = Date.now()): boolean {
  if (!id) return false;
  const entrada = sesiones.get(id);
  if (!entrada) return false;
  if (entrada.expira <= ahora) {
    sesiones.delete(id);
    return false;
  }
  return idsIguales(id, entrada.id);
}

export function revocarSesion(id?: string | null): void {
  if (id) sesiones.delete(id);
}

export function extraerCookieSesion(header?: string): string | undefined {
  if (!header) return undefined;
  for (const parte of header.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === NOMBRE_COOKIE_SESION) {
      const valor = resto.join('=').trim();
      return valor || undefined;
    }
  }
  return undefined;
}

export function cabeceraSetCookieSesion(id: string, ttlMs = TTL_SESION_MS): string {
  const maxAge = Math.max(1, Math.floor(ttlMs / 1000));
  return `${NOMBRE_COOKIE_SESION}=${id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function cabeceraBorrarCookieSesion(): string {
  return `${NOMBRE_COOKIE_SESION}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/** Solo tests. */
export function vaciarSesiones(): void {
  sesiones.clear();
}

export function cantidadSesiones(): number {
  return sesiones.size;
}

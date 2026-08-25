import { Response } from 'express';

export type RespuestaApi<T = unknown> = {
  exito: boolean;
  mensaje: string;
  datos: T;
  meta: Record<string, unknown>;
};

export function cuerpoExito<T>(
  datos: T,
  mensaje = 'Operación completada',
  meta: Record<string, unknown> = {}
): RespuestaApi<T> {
  return { exito: true, mensaje, datos, meta };
}

export function cuerpoFallo(
  mensaje: string,
  datos: unknown = {},
  meta: Record<string, unknown> = {}
): RespuestaApi<unknown> {
  return { exito: false, mensaje, datos, meta };
}

export function codigoHttpDeError(error: unknown): number {
  const mensaje = error instanceof Error ? error.message : '';
  if (
    mensaje.includes('no autorizada') ||
    mensaje.includes('no válida') ||
    mensaje.includes('fuera del repositorio')
  ) {
    return 403;
  }
  return 500;
}

export function responderExito<T>(
  res: Response,
  datos: T,
  mensaje = 'Operación completada',
  status = 200,
  meta: Record<string, unknown> = {}
): void {
  res.status(status).json(cuerpoExito(datos, mensaje, meta));
}

export function responderFallo(
  res: Response,
  mensaje: string,
  status: number,
  datos: unknown = {},
  meta: Record<string, unknown> = {}
): void {
  res.status(status).json(cuerpoFallo(mensaje, datos, meta));
}

const ORIGENES_POR_DEFECTO = ['http://localhost:5174', 'http://127.0.0.1:5174'];

/** SPA en Vite (:5174). Sobrescribir con CORS_ORIGINS (lista separada por comas). */
export function listarOrigenesPermitidos(): string[] {
  const crudo = process.env.CORS_ORIGINS?.trim();
  if (!crudo) return [...ORIGENES_POR_DEFECTO];
  return crudo
    .split(',')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);
}

export function origenEstaPermitido(origin: string): boolean {
  if (!origin || origin === 'null') return false;
  return listarOrigenesPermitidos().includes(origin);
}

/**
 * Sin cabecera Origin (curl, herramientas locales) se permite.
 * Un Origin presente debe estar en la lista.
 */
export function origenDePeticionPermitido(origin: string | undefined): boolean {
  if (!origin) return true;
  return origenEstaPermitido(origin);
}

export function extraerOrigin(valor: unknown): string | undefined {
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor) && typeof valor[0] === 'string') return valor[0];
  return undefined;
}

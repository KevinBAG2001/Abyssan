/**
 * Subtítulos de modales de confirmación con preview.
 *
 * El título del modal debe caber en el ancho del diálogo (≈290 px útiles con
 * icono y botón X). Para no truncar nombres largos como «feature/pagos» o
 * «release/v2-rollback», extraemos el contexto direccional a un subtítulo que
 * vive en una línea aparte y usa fuente menor.
 *
 * Reglas:
 *  - Siempre devolvemos texto plano, sin HTML.
 *  - Nunca duplicamos literal el título; aportamos información nueva
 *    (hacia dónde, sobre qué rama, modo de reset, etc.).
 *  - Si no hay dato útil (p. ej. fusionar la rama consigo misma), devolvemos
 *    un fallback honesto en vez de ocultar el subtítulo.
 */

export type TipoReset = 'soft' | 'mixed' | 'hard';

/** Flecha ASCII compatible con fuentes mono y accesibilidad por lector de pantalla. */
export const FLECHA_DIRECCION = '→';

export function subtituloFusion(sourceBranch: string, ramaActual: string): string {
  const origen = sourceBranch.trim();
  const destino = ramaActual.trim();
  if (!origen || !destino) {
    return origen || destino || 'rama sin nombre';
  }
  if (origen === destino) {
    return `rama actual: ${destino}`;
  }
  return `${origen} ${FLECHA_DIRECCION} ${destino}`;
}

export function subtituloReset(
  tipo: TipoReset,
  hashCortoDestino: string,
  ramaActual: string,
): string {
  const destino = hashCortoDestino.trim() || 'HEAD~?';
  const rama = ramaActual.trim() || 'HEAD';
  return `${rama} ${FLECHA_DIRECCION} ${destino} (${tipo})`;
}

export function subtituloCherryPick(hashCorto: string, ramaActual: string): string {
  const commit = hashCorto.trim() || 'commit';
  const rama = ramaActual.trim() || 'HEAD';
  return `aplicar ${commit} sobre ${rama}`;
}

export function subtituloRevert(hashCorto: string, ramaActual: string): string {
  const commit = hashCorto.trim() || 'commit';
  const rama = ramaActual.trim() || 'HEAD';
  return `revertir ${commit} en ${rama}`;
}

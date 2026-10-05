/**
 * Orden visual de las secciones del `PanelPreviewOperacion`.
 *
 * Historia (Fase 4 Identidad):
 *  - La primera versión mostraba Explicación → Cambios → Riesgos, pero el
 *    bloque Cambios puede ocupar varias líneas (commits y archivos del
 *    sourceBranch) y empuja los Riesgos fuera del viewport cuando el modal
 *    es `md` (≈480 px de alto). El usuario veía primero el campo
 *    «Escribe «RESET» para confirmar» sin ver las advertencias.
 *  - Esta constante fija el nuevo orden Explicación → Riesgos → Cambios y
 *    es la que consume el componente, para que un reordenado accidental
 *    rompa el test en vez de pasar inadvertido.
 */
export type SeccionPreview = 'explicacion' | 'riesgos' | 'cambios';

export const ORDEN_SECCIONES_PREVIEW: readonly SeccionPreview[] = [
  'explicacion',
  'riesgos',
  'cambios',
] as const;

/** Devuelve el índice (0-based) de una sección en el orden canónico. */
export function posicionSeccion(seccion: SeccionPreview): number {
  return ORDEN_SECCIONES_PREVIEW.indexOf(seccion);
}

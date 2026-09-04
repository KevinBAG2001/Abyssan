/**
 * Colores del grafo de commits — referencias a tokens Stitch (@theme en index.css).
 * Usar en SVG stroke/fill inline; no hardcodear hex en componentes.
 */
export const COLORES_RAMA_GRAFO = [
  'var(--color-ion)', // Trunk principal — Ion Violet (maqueta Stitch)
  'var(--color-primary-container)', // Biolume
  'var(--color-secondary)', // Pulse Cyan
  'var(--color-magma)', // Magma
  'var(--color-ember)', // Ember
  'var(--color-pulse)', // Pulse light
  'var(--color-gold)', // Gold
] as const;

export const COLOR_RAMA_DEFECTO = COLORES_RAMA_GRAFO[0];

import { cn } from './utils';

/**
 * Clases reutilizables del kit visual Stitch / Abyssan Instrument.
 *
 * Guía rápida de botones:
 * - `btnPrimario`   → CTA principal (Push, Confirmar commit, Guardar) — Biolume
 * - `btnSecundario` → Acciones secundarias (Fetch, Pull, Comparar)
 * - `btnGhost`      → Acciones terciarias con borde Pulse
 * - `btnDestructivo`→ Reset hard, abortar merge, descartar — Magma
 * - `btnIcono`      → Toolbar del header (consola, deshacer, refresh)
 *
 * Superficies: `panel` / `panelInset` para bloques con borde.
 * Tipografía: `labelCaps` para secciones (RAMAS, STAGING, etc.).
 */
export const ui = {
  app: 'flex flex-col h-full w-full min-h-0 min-w-0 bg-surface-container-lowest text-on-surface overflow-hidden font-mono',
  chrome: 'bg-surface-container-low border-b border-outline-variant shrink-0',
  panel: 'bg-surface-container-low border-outline-variant',
  panelInset: 'bg-surface-container border border-outline-variant rounded',
  hairline: 'bg-outline-variant',
  labelCaps: 'text-label-caps text-on-surface-variant uppercase tracking-widest',
  input:
    'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary px-3 py-1.5 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 rounded focus-visible:ring-1 focus-visible:ring-primary/40',
  inputUnderline:
    'w-full bg-surface-container-lowest border-b border-outline-variant focus:border-primary px-2 py-1.5 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus-visible:ring-1 focus-visible:ring-primary/40',
  btnPrimario:
    'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary-container text-on-primary-container font-label-md text-label-md rounded hover:brightness-110 transition-all glow-biolume-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
  btnSecundario:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md rounded border border-outline-variant transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40',
  btnGhost:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent border border-secondary text-secondary hover:bg-secondary/10 font-label-md text-label-md rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40',
  btnDestructivo:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-error/10 border border-error text-error hover:bg-error/20 font-label-md text-label-md rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40',
  btnIcono:
    'p-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded border border-outline-variant transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  modal:
    'w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden',
  modalOverlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/60 backdrop-blur-sm',
  ramaActiva:
    'bg-surface-container-high text-primary border-l-2 border-primary font-semibold',
  chipRama:
    'inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-high rounded text-code-sm text-on-surface border border-outline-variant',
  hoverBorde:
    'hover:border-outline',
} as const;

export function cnUi(...parts: Array<string | false | null | undefined>) {
  return cn(...parts);
}

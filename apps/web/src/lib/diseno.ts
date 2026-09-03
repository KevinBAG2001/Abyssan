import { cn } from './utils';

/** Clases reutilizables del kit visual Stitch / Abyssan Instrument */
export const ui = {
  app: 'flex flex-col h-full w-full bg-surface-container-lowest text-on-surface overflow-hidden font-sans',
  chrome: 'bg-surface-container-low border-b border-outline-variant',
  panel: 'bg-surface-container-low border-outline-variant',
  panelInset: 'bg-surface-container border border-outline-variant rounded',
  hairline: 'bg-outline-variant',
  labelCaps: 'text-label-caps text-on-surface-variant uppercase tracking-widest',
  input:
    'w-full bg-surface-container-lowest border border-outline-variant focus:border-primary px-3 py-1.5 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 rounded',
  inputUnderline:
    'w-full bg-surface-container-lowest border-b border-outline-variant focus:border-primary px-2 py-1.5 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50',
  btnPrimario:
    'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary-container text-on-primary-container font-label-md text-label-md rounded hover:brightness-110 transition-all glow-biolume-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100',
  btnSecundario:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md rounded border border-outline-variant transition-colors disabled:opacity-40',
  btnGhost:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent border border-secondary text-secondary hover:bg-secondary/10 font-label-md text-label-md rounded transition-colors',
  btnDestructivo:
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-error/10 border border-error text-error hover:bg-error/20 font-label-md text-label-md rounded transition-colors',
  btnIcono:
    'p-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded border border-outline-variant transition-colors disabled:opacity-40',
  modal:
    'w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden',
  modalOverlay: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/60 backdrop-blur-sm',
  ramaActiva:
    'bg-surface-container-high text-primary border-l-2 border-primary font-semibold',
  chipRama:
    'inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-high rounded text-code-sm text-on-surface border border-outline-variant',
} as const;

export function cnUi(...parts: Array<string | false | null | undefined>) {
  return cn(...parts);
}

import { GitBranch, History, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PanelMovil = 'historial' | 'cambios' | 'ramas';

type BarraNavegacionMovilProps = {
  activo: PanelMovil;
  onCambiar: (panel: PanelMovil) => void;
};

const PESTANAS: { id: PanelMovil; label: string; icon: typeof History }[] = [
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'cambios', label: 'Cambios', icon: Layers },
  { id: 'ramas', label: 'Ramas', icon: GitBranch },
];

export function BarraNavegacionMovil({ activo, onCambiar }: BarraNavegacionMovilProps) {
  return (
    <nav
      className="shrink-0 grid grid-cols-3 border-t border-outline-variant bg-surface-container-low pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      aria-label="Navegación principal"
    >
      {PESTANAS.map(({ id, label, icon: Icon }) => {
        const seleccionado = activo === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onCambiar(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[48px] text-label-md transition-colors',
              seleccionado
                ? 'text-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
            aria-current={seleccionado ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

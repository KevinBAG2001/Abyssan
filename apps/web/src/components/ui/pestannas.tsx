import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PestanaItem = {
  id: string;
  etiqueta: string;
  icono?: ReactNode;
};

type PestannasProps = {
  pestanas: PestanaItem[];
  activa: string;
  onCambiar: (id: string) => void;
  className?: string;
};

/** Pestañas pill del kit Stitch (selector repo, modos, etc.). */
export function Pestannas({ pestanas, activa, onCambiar, className }: PestannasProps) {
  return (
    <div
      className={cn(
        'flex bg-surface-container-lowest p-1 rounded border border-outline-variant gap-0.5',
        className
      )}
      role="tablist"
    >
      {pestanas.map((p) => {
        const seleccionada = p.id === activa;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={seleccionada}
            onClick={() => onCambiar(p.id)}
            className={cn(
              'flex-1 min-w-0 py-2 px-2 text-label-md font-medium rounded-sm transition-colors flex items-center justify-center gap-1.5',
              seleccionada
                ? 'bg-surface-container-high text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
            )}
          >
            {p.icono}
            <span className="truncate">{p.etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}

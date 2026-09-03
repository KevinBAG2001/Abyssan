import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ui } from '@/lib/diseno';
import { cn } from '@/lib/utils';

type ModalEncabezadoProps = {
  id?: string;
  titulo: string;
  subtitulo?: string;
  icono?: ReactNode;
  onCerrar: () => void;
  className?: string;
};

/** Encabezado estándar de modales Stitch — título, icono opcional y cierre. */
export function ModalEncabezado({
  id,
  titulo,
  subtitulo,
  icono,
  onCerrar,
  className,
}: ModalEncabezadoProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-high/50 shrink-0',
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {icono && (
          <div className="w-8 h-8 rounded-lg bg-primary-container/15 flex items-center justify-center shrink-0">
            {icono}
          </div>
        )}
        <div className="min-w-0">
          <h2 id={id} className="text-headline-sm text-on-surface truncate">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="text-label-md text-on-surface-variant/80 mt-0.5">{subtitulo}</p>
          )}
        </div>
      </div>
      <button type="button" onClick={onCerrar} className={cn(ui.btnIcono, 'shrink-0')} aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

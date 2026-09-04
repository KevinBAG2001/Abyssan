import type { ReactNode } from 'react';
import { ui } from '@/lib/diseno';
import { cn } from '@/lib/utils';

type ModalPieProps = {
  onCancelar: () => void;
  etiquetaCancelar?: string;
  onConfirmar?: () => void;
  etiquetaConfirmar?: string;
  tipoConfirmar?: 'button' | 'submit';
  deshabilitado?: boolean;
  cargando?: boolean;
  varianteConfirmar?: 'primario' | 'destructivo' | 'secundario';
  iconoConfirmar?: ReactNode;
  className?: string;
  hijos?: ReactNode;
};

/** Pie estándar de modales — cancelar + acción principal alineados a la derecha. */
export function ModalPie({
  onCancelar,
  etiquetaCancelar = 'Cancelar',
  onConfirmar,
  etiquetaConfirmar = 'Confirmar',
  tipoConfirmar = 'button',
  deshabilitado = false,
  cargando = false,
  varianteConfirmar = 'primario',
  iconoConfirmar,
  className,
  hijos,
}: ModalPieProps) {
  const claseConfirmar =
    varianteConfirmar === 'destructivo'
      ? ui.btnDestructivo
      : varianteConfirmar === 'secundario'
        ? ui.btnSecundario
        : ui.btnPrimario;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant bg-surface-container shrink-0',
        className
      )}
    >
      {hijos}
      <button
        type="button"
        onClick={onCancelar}
        className="px-3 py-1.5 text-label-md text-on-surface-variant hover:text-on-surface rounded transition-colors"
      >
        {etiquetaCancelar}
      </button>
      {onConfirmar !== undefined && (
        <button
          type={tipoConfirmar === 'submit' ? 'submit' : 'button'}
          onClick={tipoConfirmar === 'button' ? onConfirmar : undefined}
          disabled={deshabilitado || cargando}
          className={cn(claseConfirmar, 'min-w-[5rem]')}
        >
          {iconoConfirmar}
          {cargando ? 'Procesando…' : etiquetaConfirmar}
        </button>
      )}
    </div>
  );
}

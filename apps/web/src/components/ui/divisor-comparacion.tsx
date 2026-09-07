import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type DivisorComparacionProps = {
  porcentaje: number;
  onPorcentaje: (valor: number) => void;
  contenedorRef: RefObject<HTMLElement | null>;
  minimo?: number;
  maximo?: number;
  className?: string;
};

/**
 * Divisor vertical arrastrable para vista lado a lado.
 * Redimensiona columnas; no recorta dos capas de texto (eso las superpone).
 */
export function DivisorComparacion({
  porcentaje,
  onPorcentaje,
  contenedorRef,
  minimo = 22,
  maximo = 78,
  className,
}: DivisorComparacionProps) {
  const arrastrando = useRef(false);

  const aplicar = useCallback(
    (clientX: number) => {
      const caja = contenedorRef.current;
      if (!caja) return;
      const rect = caja.getBoundingClientRect();
      if (rect.width <= 0) return;
      const crudo = ((clientX - rect.left) / rect.width) * 100;
      onPorcentaje(Math.max(minimo, Math.min(maximo, crudo)));
    },
    [contenedorRef, maximo, minimo, onPorcentaje]
  );

  useEffect(() => {
    const enMove = (e: PointerEvent) => {
      if (!arrastrando.current) return;
      e.preventDefault();
      aplicar(e.clientX);
    };
    const enUp = () => {
      arrastrando.current = false;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    window.addEventListener('pointermove', enMove);
    window.addEventListener('pointerup', enUp);
    window.addEventListener('pointercancel', enUp);
    return () => {
      window.removeEventListener('pointermove', enMove);
      window.removeEventListener('pointerup', enUp);
      window.removeEventListener('pointercancel', enUp);
    };
  }, [aplicar]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(porcentaje)}
      aria-valuemin={minimo}
      aria-valuemax={maximo}
      aria-label="Ancho de la comparación lado a lado"
      tabIndex={0}
      className={cn(
        'absolute top-0 bottom-0 z-20 w-3 -translate-x-1/2 cursor-col-resize touch-none',
        'flex items-center justify-center',
        className
      )}
      style={{ left: `${porcentaje}%` }}
      onPointerDown={(e) => {
        e.preventDefault();
        arrastrando.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        aplicar(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onPorcentaje(Math.max(minimo, porcentaje - 4));
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onPorcentaje(Math.min(maximo, porcentaje + 4));
        }
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 w-px bg-linear-to-b from-transparent via-secondary to-transparent" />
      <div className="pointer-events-none relative flex size-5 items-center justify-center rounded-md bg-on-surface shadow-sm">
        <GripVertical className="size-3.5 text-void" />
      </div>
    </div>
  );
}

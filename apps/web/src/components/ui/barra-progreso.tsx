import { cn } from '@/lib/utils';

type BarraProgresoProps = {
  valor: number;
  className?: string;
  etiqueta?: string;
};

/** Barra de progreso densa (tokens Abyssan). Idea de 8bitcn Progress, sin pixel-art. */
export function BarraProgreso({ valor, className, etiqueta }: BarraProgresoProps) {
  const ancho = Math.max(0, Math.min(100, valor));
  return (
    <div
      role="progressbar"
      aria-valuenow={ancho}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta ?? 'Progreso'}
      className={cn('h-1.5 w-full overflow-hidden rounded-sm bg-surface-container-highest', className)}
    >
      <div
        className="h-full bg-primary-container transition-[width] duration-200"
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

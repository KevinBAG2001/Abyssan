import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastNotificacionProps = {
  mensaje: string;
  tipo: 'success' | 'error';
};

export function ToastNotificacion({ mensaje, tipo }: ToastNotificacionProps) {
  return (
    <div
      role="status"
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-2xl text-code-sm font-medium border backdrop-blur-sm max-w-[min(24rem,calc(100vw-2rem))] pointer-events-none',
        tipo === 'success'
          ? 'bg-surface-container-high/95 text-primary border-primary/50 glow-biolume-sm'
          : 'bg-error-container/90 text-error border-error/50'
      )}
    >
      {tipo === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-error shrink-0" />
      )}
      <span>{mensaje}</span>
    </div>
  );
}

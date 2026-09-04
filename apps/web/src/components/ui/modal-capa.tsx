import { useEffect, type ReactNode } from 'react';
import { Portal } from './portal';
import { cn } from '@/lib/utils';

type ModalCapaProps = {
  children: ReactNode;
  className?: string;
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'compare' | 'wide' | 'paleta';
  labelledBy?: string;
  onCerrar: () => void;
};

const ANCHOS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  compare: 'max-w-2xl',
  wide: 'max-w-4xl',
  paleta: 'max-w-[420px]',
} as const;

/**
 * Modal con `<dialog open>` no modal (sin showModal) para evitar capas fantasma
 * que bloqueen clics en toda la app. El backdrop es un botón explícito.
 */
export function ModalCapa({
  children,
  className,
  ancho = 'md',
  labelledBy,
  onCerrar,
}: ModalCapaProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <Portal>
      <dialog
        open
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="fixed inset-0 z-[200] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      >
        <button
          type="button"
          className="absolute inset-0 bg-void/70 backdrop-blur-sm"
          aria-label="Cerrar modal"
          onClick={onCerrar}
        />
        <div
          className={cn(
            'relative w-full min-w-[min(100%,18rem)] shrink-0 rounded-lg border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden',
            ANCHOS[ancho],
            className
          )}
        >
          {children}
        </div>
      </dialog>
    </Portal>
  );
}

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

/** Anchos explícitos en rem (estables frente a utilidades `max-w-*` de Tailwind). */
const ANCHOS = {
  sm: 'sm:max-w-[24rem]',
  md: 'sm:max-w-[28rem]',
  lg: 'sm:max-w-[32rem]',
  xl: 'sm:max-w-[48rem]',
  compare: 'sm:max-w-[42rem]',
  wide: 'sm:max-w-[56rem]',
  paleta: 'sm:max-w-[26.25rem]',
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
        className="fixed inset-0 z-[200] m-0 flex h-full max-h-none w-full max-w-none items-end justify-center border-0 bg-transparent p-0 sm:items-center sm:p-4"
      >
        <button
          type="button"
          className="absolute inset-0 bg-void/70 backdrop-blur-sm"
          aria-label="Cerrar modal"
          onClick={onCerrar}
        />
        <div
          className={cn(
            'relative flex max-h-[calc(100dvh-2rem)] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-none border border-outline-variant bg-surface-container-low shadow-2xl sm:min-w-[min(100%,18rem)] sm:max-h-[min(calc(100dvh-2rem),90vh)] sm:rounded-lg max-sm:h-[100dvh] max-sm:max-h-[100dvh]',
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

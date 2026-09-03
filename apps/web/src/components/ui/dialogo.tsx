import { type ReactNode } from 'react';
import { ModalCapa } from './modal-capa';
import { cn } from '@/lib/utils';

type DialogoProps = {
  children: ReactNode;
  className?: string;
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'compare' | 'wide' | 'paleta';
  labelledBy?: string;
  onCerrar: () => void;
};

/** Diálogo modal con portal — no usar div fixed dentro de sidebars o paneles estrechos. */
export function Dialogo({ children, className, ancho = 'md', labelledBy, onCerrar }: DialogoProps) {
  return (
    <ModalCapa ancho={ancho} labelledBy={labelledBy} onCerrar={onCerrar} className={cn('p-0', className)}>
      {children}
    </ModalCapa>
  );
}

import type { InputHTMLAttributes } from 'react';
import { ui } from '@/lib/diseno';
import { cn } from '@/lib/utils';

type CampoEntradaProps = {
  id: string;
  etiqueta: string;
  ayuda?: string;
  variante?: 'caja' | 'subrayado';
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

/** Campo de formulario con etiqueta caps y estilos del kit Stitch. */
export function CampoEntrada({
  id,
  etiqueta,
  ayuda,
  variante = 'caja',
  className,
  ...inputProps
}: CampoEntradaProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className={ui.labelCaps}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={variante === 'subrayado' ? ui.inputUnderline : ui.input}
        {...inputProps}
      />
      {ayuda && <p className="text-label-md text-on-surface-variant/70">{ayuda}</p>}
    </div>
  );
}

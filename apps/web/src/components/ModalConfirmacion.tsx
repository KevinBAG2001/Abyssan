import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

export type ModalConfirmacionProps = {
  titulo: string;
  descripcion: string;
  etiquetaConfirmar?: string;
  peligro?: boolean;
  nombreRequerido?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export const ModalConfirmacion: React.FC<ModalConfirmacionProps> = ({
  titulo,
  descripcion,
  etiquetaConfirmar = 'Confirmar',
  peligro = true,
  nombreRequerido,
  onConfirmar,
  onCancelar,
}) => {
  const [escrito, setEscrito] = useState('');
  const listo = !nombreRequerido || escrito === nombreRequerido;

  return (
    <Dialogo
      onCerrar={onCancelar}
      labelledBy="titulo-confirmacion"
      className={cn(ui.modal, 'max-w-md')}
    >
      <div className="p-4 border-b border-outline-variant flex items-start justify-between bg-surface-container-low">
        <div className="flex items-start gap-2">
          <ShieldAlert className={cn('w-5 h-5 mt-0.5 shrink-0', peligro ? 'text-magma' : 'text-ember')} />
          <h3 id="titulo-confirmacion" className="text-headline-sm text-on-surface">
            {titulo}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className={ui.btnIcono}
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{descripcion}</div>
      {nombreRequerido && (
        <div className="px-4 pb-3">
          <label htmlFor="confirmacion-nombre" className="block text-label-caps text-on-surface-variant mb-1">
            Escribe <span className="font-mono text-magma">{nombreRequerido}</span> para confirmar
          </label>
          <input
            id="confirmacion-nombre"
            autoFocus
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            className={cn(ui.input, 'font-mono')}
          />
        </div>
      )}
      <div className="p-4 pt-0 flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 text-label-md text-on-surface-variant hover:text-on-surface rounded transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!listo}
          onClick={onConfirmar}
          className={cn(
            'px-4 py-1.5 text-label-md font-semibold rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all',
            peligro ? ui.btnDestructivo : 'bg-ember text-on-primary hover:brightness-110'
          )}
        >
          {etiquetaConfirmar}
        </button>
      </div>
    </Dialogo>
  );
};

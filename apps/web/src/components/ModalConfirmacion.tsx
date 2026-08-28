import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Dialogo } from './ui/dialogo';

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
      className="w-full max-w-md rounded-xl border border-[#2e354e] bg-[#181c2d] p-0 shadow-2xl backdrop:bg-black/60"
    >
      <div className="p-4 border-b border-[#23283b] flex items-start justify-between bg-[#141724]">
        <div className="flex items-start space-x-2">
          <ShieldAlert className={`w-5 h-5 mt-0.5 ${peligro ? 'text-rose-400' : 'text-amber-400'}`} />
          <h3 id="titulo-confirmacion" className="font-bold text-sm text-white">
            {titulo}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{descripcion}</div>
      {nombreRequerido && (
        <div className="px-4 pb-3">
          <label htmlFor="confirmacion-nombre" className="block text-[11px] text-slate-400 mb-1">
            Escribe <span className="font-mono text-rose-300">{nombreRequerido}</span> para confirmar
          </label>
          <input
            id="confirmacion-nombre"
            autoFocus
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            className="w-full bg-[#0f111a] border border-[#2e354e] rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500/60"
          />
        </div>
      )}
      <div className="p-4 pt-0 flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!listo}
          onClick={onConfirmar}
          className={`px-3 py-1.5 text-xs font-bold rounded disabled:opacity-40 disabled:cursor-not-allowed ${
            peligro
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
          }`}
        >
          {etiquetaConfirmar}
        </button>
      </div>
    </Dialogo>
  );
};

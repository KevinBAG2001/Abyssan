import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';
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
    <Dialogo onCerrar={onCancelar} labelledBy="titulo-confirmacion" ancho="md">
      <ModalEncabezado
        id="titulo-confirmacion"
        titulo={titulo}
        subtitulo={peligro ? 'Operación destructiva — no se puede deshacer fácilmente' : 'Confirma antes de continuar'}
        icono={<ShieldAlert className={cn('w-4 h-4', peligro ? 'text-magma' : 'text-ember')} />}
        onCerrar={onCancelar}
      />

      {peligro && (
        <div className="mx-4 mt-4 flex items-start gap-2 px-3 py-2.5 bg-magma/10 border border-magma/25 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-magma shrink-0 mt-0.5" />
          <p className="text-code-sm text-magma/90 leading-relaxed">
            Esta acción puede eliminar trabajo local o reescribir el historial. Revísalo con calma.
          </p>
        </div>
      )}

      <div className="p-4 text-code-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap font-mono">
        {descripcion}
      </div>

      {nombreRequerido && (
        <div className="px-4 pb-3">
          <CampoEntrada
            id="confirmacion-nombre"
            etiqueta={`Escribe «${nombreRequerido}» para confirmar`}
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            autoFocus
            className="[&_label]:normal-case [&_label]:tracking-normal [&_label]:font-mono"
          />
        </div>
      )}

      <ModalPie
        onCancelar={onCancelar}
        onConfirmar={onConfirmar}
        etiquetaConfirmar={etiquetaConfirmar}
        deshabilitado={!listo}
        varianteConfirmar={peligro ? 'destructivo' : 'primario'}
      />
    </Dialogo>
  );
};

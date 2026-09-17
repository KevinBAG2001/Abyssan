import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';
import { cn } from '../lib/utils';
import type { PreviewOperacionModel } from '../domain/models/GitModels';

export type ModalConfirmacionProps = {
  titulo: string;
  descripcion: string;
  etiquetaConfirmar?: string;
  peligro?: boolean;
  nombreRequerido?: string;
  preview?: PreviewOperacionModel;
  bloquearConfirmar?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

function etiquetaArchivo(tipo: PreviewOperacionModel['archivosAfectados'][number]['tipo']): string {
  if (tipo === 'agregado') return 'A';
  if (tipo === 'eliminado') return 'D';
  if (tipo === 'conflicto') return 'C';
  return 'M';
}

export const ModalConfirmacion: React.FC<ModalConfirmacionProps> = ({
  titulo,
  descripcion,
  etiquetaConfirmar = 'Confirmar',
  peligro = true,
  nombreRequerido,
  preview,
  bloquearConfirmar = false,
  onConfirmar,
  onCancelar,
}) => {
  const [escrito, setEscrito] = useState('');
  const listo = !bloquearConfirmar && (!nombreRequerido || escrito === nombreRequerido);
  const archivos = preview?.archivosAfectados.slice(0, 8) ?? [];
  const restoArchivos = Math.max(0, (preview?.archivosAfectados.length ?? 0) - archivos.length);

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

      {preview && (
        <div className="px-4 pb-3 space-y-2 max-h-52 overflow-y-auto">
          {preview.riesgos.length > 0 && (
            <ul className="text-code-sm text-ember space-y-1">
              {preview.riesgos.map((riesgo) => (
                <li key={riesgo}>• {riesgo}</li>
              ))}
            </ul>
          )}
          {archivos.length > 0 && (
            <ul className="space-y-1">
              {archivos.map((archivo) => (
                <li
                  key={`${archivo.tipo}-${archivo.path}`}
                  className="flex items-center gap-2 text-code-sm font-mono text-on-surface-variant"
                >
                  <span
                    className={cn(
                      'w-4 shrink-0 text-[10px]',
                      archivo.tipo === 'conflicto' ? 'text-magma' : 'text-primary'
                    )}
                  >
                    {etiquetaArchivo(archivo.tipo)}
                  </span>
                  <span className="truncate">{archivo.path}</span>
                </li>
              ))}
              {restoArchivos > 0 && (
                <li className="text-code-sm text-on-surface-variant/70">… y {restoArchivos} más</li>
              )}
            </ul>
          )}
        </div>
      )}

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

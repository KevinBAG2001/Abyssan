import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface ConfirmacionIdentidadProps {
  hayCambiosCredencial: boolean;
  hayCambiosAvatar: boolean;
  nombreInicial: string;
  correoInicial: string;
  alcanceInicial: 'local' | 'global';
  nombre: string;
  correo: string;
  alcance: 'local' | 'global';
}

function etiquetaAlcance(valor: 'local' | 'global') {
  return valor === 'local' ? 'solo este repositorio' : 'global';
}

export const ConfirmacionIdentidad: React.FC<ConfirmacionIdentidadProps> = ({
  hayCambiosCredencial,
  hayCambiosAvatar,
  nombreInicial,
  correoInicial,
  alcanceInicial,
  nombre,
  correo,
  alcance,
}) => (
  <div className="space-y-3">
    <div className="flex items-start gap-2 px-3 py-2.5 bg-ember/10 border border-ember/20 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-ember mt-0.5 shrink-0" />
      <p className="text-xs text-ember/90 leading-relaxed">
        Los commits ya existentes no cambian. Los siguientes usarán este nombre y correo.
        {alcance === 'global'
          ? ' El alcance global afecta a todos los repos sin config local (en este entorno Git).'
          : ' Solo se escribe en este repositorio.'}
      </p>
    </div>
    <dl className="space-y-2 text-xs font-mono">
      {hayCambiosCredencial && (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <dt className="text-on-surface-variant/70 w-16 shrink-0">Antes</dt>
            <dd className="truncate text-on-surface-variant">
              {nombreInicial || '—'} · {correoInicial || '—'} · {etiquetaAlcance(alcanceInicial)}
            </dd>
          </div>
          <div className="flex items-center gap-2 min-w-0 text-primary">
            <dt className="w-16 shrink-0 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Nuevo
            </dt>
            <dd className="truncate font-medium">
              {nombre.trim()} · {correo.trim()} · {etiquetaAlcance(alcance)}
            </dd>
          </div>
        </>
      )}
      {hayCambiosAvatar && (
        <p className="text-on-surface-variant/80">También se actualizará el avatar de la interfaz.</p>
      )}
    </dl>
  </div>
);

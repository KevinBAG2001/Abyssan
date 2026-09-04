import React, { useState } from 'react';
import { History, Undo2, Copy, Check, Clock } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import type { EntradaJournal } from '../domain/models/GitModels';

type Props = {
  onCerrar: () => void;
  onDeshacer: (id: string) => void;
  entradas: EntradaJournal[];
  loading?: boolean;
};

function etiquetaTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    crearRama: 'rama',
    borrarRama: 'rama',
    renombrarRama: 'rama',
    commit: 'commit',
    amend: 'amend',
    reset: 'reset',
    discard: 'discard',
    checkout: 'checkout',
    merge: 'merge',
    clone: 'clone',
    init: 'init',
    'cherry-pick': 'cherry-pick',
    revert: 'revert',
    pull: 'pull',
    push: 'push',
  };
  return mapa[tipo] ?? tipo;
}

function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function TimelineListaEntradas({
  entradas,
  seleccionadaId,
  onSeleccionar,
}: {
  entradas: EntradaJournal[];
  seleccionadaId?: string;
  onSeleccionar: (id: string) => void;
}) {
  if (entradas.length === 0) {
    return (
      <li className="p-4 text-code-sm text-on-surface-variant/70 italic">Aún no hay operaciones en este repositorio.</li>
    );
  }

  return (
    <>
      {entradas.map((e) => {
        const activa = seleccionadaId === e.id;
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSeleccionar(e.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 border-l-2 text-code-sm transition-colors',
                activa
                  ? 'border-ion bg-surface-container-highest text-on-surface'
                  : 'border-transparent hover:bg-surface-container-high text-on-surface-variant'
              )}
            >
              <span className="block font-mono text-code-sm text-ion/80 uppercase">{etiquetaTipo(e.tipo)}</span>
              <span className="block truncate font-semibold">{e.descripcion}</span>
              <span className="block text-code-sm text-on-surface-variant/70">{hora(e.timestamp)}</span>
              {e.deshecha && <span className="text-code-sm text-on-surface-variant/60">Deshecha</span>}
            </button>
          </li>
        );
      })}
    </>
  );
}

function TimelineDetalleEntrada({
  entrada,
  loading,
  onDeshacer,
}: {
  entrada: EntradaJournal;
  loading?: boolean;
  onDeshacer: (id: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!entrada.comandoGit) return;
    try {
      await navigator.clipboard.writeText(entrada.comandoGit);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-code-sm text-on-surface-variant/80">
          <Clock className="w-3.5 h-3.5" />
          <span className={ui.labelCaps}>Estado anterior</span>
        </div>
        <p className="mt-1.5 text-code-sm text-on-surface leading-relaxed">{entrada.estadoAnterior}</p>
        {entrada.archivosSnapshot > 0 && (
          <p className="mt-1 text-code-sm text-primary/90">
            Snapshot: {entrada.archivosSnapshot} archivo{entrada.archivosSnapshot === 1 ? '' : 's'} sucio
            {entrada.archivosSnapshot === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div>
        <span className={cn(ui.labelCaps, 'block mb-1.5')}>Comando Git</span>
        <div className="flex items-start gap-2 rounded border border-outline-variant bg-void px-3 py-2 font-mono text-code-sm text-primary">
          <span className="flex-1 break-all leading-relaxed">{entrada.comandoGit}</span>
          <button
            type="button"
            onClick={() => void copiar()}
            className={ui.btnIcono}
            title="Copiar comando"
            aria-label="Copiar comando Git"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          type="button"
          disabled={loading || !entrada.puedeDeshacer}
          onClick={() => onDeshacer(entrada.id)}
          className={cn(ui.btnSecundario, 'border-ion/40 text-ion bg-ion/10 hover:bg-ion/15 text-code-sm')}
          title={entrada.puedeDeshacer ? 'Deshacer esta operación' : entrada.motivoBloqueo}
        >
          <Undo2 className="w-3.5 h-3.5" />
          Deshacer
        </button>
        {!entrada.puedeDeshacer && entrada.motivoBloqueo && (
          <p className="text-code-sm text-on-surface-variant">{entrada.motivoBloqueo}</p>
        )}
      </div>
    </div>
  );
}

export const PanelTimeline: React.FC<Props> = ({ entradas, loading, onCerrar, onDeshacer }) => {
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const actual =
    (seleccion ? entradas.find((e) => e.id === seleccion) : undefined) ??
    entradas.find((e) => e.esPunta) ??
    entradas[0];

  return (
    <Dialogo onCerrar={onCerrar} labelledBy="titulo-timeline" ancho="xl" className="max-w-3xl">
      <div className="flex items-center gap-1.5 border-b border-outline-variant px-4 py-2 bg-void shrink-0">
        <span className="size-2.5 rounded-full bg-magma/80" />
        <span className="size-2.5 rounded-full bg-ember/80" />
        <span className="size-2.5 rounded-full bg-primary/80" />
        <span className="ml-2 text-code-sm text-on-surface-variant/70 font-mono">abyssan — timeline</span>
      </div>

      <ModalEncabezado
        id="titulo-timeline"
        titulo="Timeline — Time Machine"
        subtitulo="Journal de operaciones. El reflog sigue en la consola como red de emergencia."
        icono={<History className="w-4 h-4 text-tertiary-fixed-dim" />}
        onCerrar={onCerrar}
      />

      <div className="flex flex-col md:flex-row min-h-[18rem] max-h-[70vh] overflow-hidden">
        <ol className="w-full md:w-56 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r border-outline-variant overflow-y-auto bg-surface-container-low/60 max-h-[40vh] md:max-h-none">
          <TimelineListaEntradas entradas={entradas} seleccionadaId={actual?.id} onSeleccionar={setSeleccion} />
        </ol>

        <section className="flex-1 p-4 overflow-y-auto min-w-0" aria-live="polite">
          {!actual ? (
            <p className="text-code-sm text-on-surface-variant/70">Selecciona una entrada del journal.</p>
          ) : (
            <TimelineDetalleEntrada entrada={actual} loading={loading} onDeshacer={onDeshacer} />
          )}
        </section>
      </div>
    </Dialogo>
  );
};

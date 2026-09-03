import React, { useState } from 'react';
import { History, Undo2, Copy, Check, X, Clock } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import type { EntradaJournal } from '../domain/models/GitModels';

type Props = {
  abierta: boolean;
  entradas: EntradaJournal[];
  loading?: boolean;
  onCerrar: () => void;
  onDeshacer: (id: string) => void;
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

export const PanelTimeline: React.FC<Props> = ({ abierta, entradas, loading, onCerrar, onDeshacer }) => {
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!abierta) return null;

  const actual =
    (seleccion ? entradas.find((e) => e.id === seleccion) : undefined) ??
    entradas.find((e) => e.esPunta) ??
    entradas[0];

  const copiar = async () => {
    if (!actual?.comandoGit) return;
    try {
      await navigator.clipboard.writeText(actual.comandoGit);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Dialogo
      onCerrar={onCerrar}
      labelledBy="titulo-timeline"
      className="w-full max-w-3xl rounded-xl border border-outline-variant bg-surface-container p-0 shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex items-center gap-1.5 border-b border-outline-variant px-4 py-2 bg-void">
        <span className="size-2.5 rounded-full bg-magma/80" />
        <span className="size-2.5 rounded-full bg-ember/80" />
        <span className="size-2.5 rounded-full bg-primary/80" />
        <span className="ml-2 text-[10px] text-on-surface-variant/70 font-mono">abyssan — timeline</span>
        <button
          type="button"
          onClick={onCerrar}
          className="ml-auto p-1 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded"
          aria-label="Cerrar timeline"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
        <History className="w-5 h-5 text-tertiary-fixed-dim" />
        <div>
          <h2 id="titulo-timeline" className="font-bold text-sm text-on-surface">
            Timeline de operaciones
          </h2>
          <p className="text-[11px] text-on-surface-variant">
            Recorre el journal. El reflog de Git queda en la consola como red de emergencia.
          </p>
        </div>
      </div>

      <div className="flex min-h-88 max-h-[70vh]">
        <ol className="w-56 shrink-0 border-r border-outline-variant overflow-y-auto bg-surface-container-low/60">
          {entradas.length === 0 ? (
            <li className="p-4 text-xs text-on-surface-variant/70 italic">Aún no hay operaciones en este repositorio.</li>
          ) : (
            entradas.map((e) => {
              const activa = actual?.id === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccion(e.id)}
                    className={`w-full text-left px-3 py-2.5 border-l-2 text-xs transition-colors ${
                      activa
                        ? 'border-tertiary-fixed-dim bg-surface-container-highest text-on-surface'
                        : 'border-transparent hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="block font-mono text-[10px] text-tertiary-fixed-dim/80">{etiquetaTipo(e.tipo)}</span>
                    <span className="block truncate font-semibold">{e.descripcion}</span>
                    <span className="block text-[10px] text-on-surface-variant/70">{hora(e.timestamp)}</span>
                    {e.deshecha && <span className="text-[10px] text-on-surface-variant/70">Deshecha</span>}
                  </button>
                </li>
              );
            })
          )}
        </ol>

        <section className="flex-1 p-4 overflow-y-auto" aria-live="polite">
          {!actual ? (
            <p className="text-sm text-on-surface-variant/70">Selecciona una entrada del journal.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-bold">
                  <Clock className="w-3 h-3" />
                  Estado anterior
                </div>
                <p className="mt-1 text-sm text-on-surface">{actual.estadoAnterior}</p>
                {actual.archivosSnapshot > 0 && (
                  <p className="mt-1 text-[11px] text-teal-300">
                    Snapshot: {actual.archivosSnapshot} archivo{actual.archivosSnapshot === 1 ? '' : 's'} sucio
                    {actual.archivosSnapshot === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-bold mb-1">Comando Git</div>
                <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-void px-3 py-2 font-mono text-[11px] text-primary">
                  <span className="flex-1 break-all">{actual.comandoGit}</span>
                  <button
                    type="button"
                    onClick={() => void copiar()}
                    className="shrink-0 p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                    title="Copiar comando"
                    aria-label="Copiar comando Git"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || !actual.puedeDeshacer}
                  onClick={() => onDeshacer(actual.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-tertiary-fixed-dim/15 text-tertiary border border-tertiary-fixed-dim/30 text-xs font-semibold disabled:opacity-40 hover:bg-tertiary-fixed-dim/25"
                  title={actual.puedeDeshacer ? 'Deshacer esta operación' : actual.motivoBloqueo}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Deshacer
                </button>
                {!actual.puedeDeshacer && (
                  <p className="text-[11px] text-on-surface-variant">{actual.motivoBloqueo}</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </Dialogo>
  );
};

import React, { useEffect, useState } from 'react';
import { GitCommit, GitArchivoCambio } from '../types/git';
import { FileText } from 'lucide-react';
import { Portal } from './ui/portal';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { CabeceraInspector, DetallesCommit } from './commit/InfoCommit';

type OpcionesDiffArchivo = { commit?: string; desde?: string; hasta?: string };

interface CommitDetailsModalProps {
  commit: GitCommit | null;
  repoPath: string | null;
  ramaActual?: string;
  ramaInspeccionada?: string | null;
  onClose: () => void;
  onCheckout: (target: string) => void;
  onInspeccionarArchivo: (path: string, opciones: OpcionesDiffArchivo) => void;
}

function etiquetaEstado(status: GitArchivoCambio['status']): string {
  if (status === 'added') return 'A';
  if (status === 'deleted') return 'D';
  if (status === 'renamed') return 'R';
  return 'M';
}

function ListaArchivos({
  titulo,
  archivos,
  onElegir,
}: {
  titulo: string;
  archivos: GitArchivoCambio[];
  onElegir: (archivo: GitArchivoCambio) => void;
}) {
  if (archivos.length === 0) {
    return (
      <div>
        <span className={cn(ui.labelCaps, 'block mb-1.5')}>{titulo}</span>
        <p className="text-code-sm text-on-surface-variant/70 italic">Sin archivos en este alcance</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <FileText className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
        <span className={ui.labelCaps}>
          {titulo} ({archivos.length})
        </span>
      </div>
      <div className={cn(ui.panelInset, 'divide-y divide-outline-variant/50 max-h-48 overflow-y-auto')}>
        {archivos.map((archivo) => (
          <button
            type="button"
            key={`${archivo.status}-${archivo.path}`}
            onClick={() => onElegir(archivo)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-surface-container-high/60 transition-colors"
          >
            <span className="font-mono text-[10px] text-primary w-4 shrink-0">{etiquetaEstado(archivo.status)}</span>
            <span className="truncate font-mono text-code-sm text-on-surface">{archivo.path}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function useArchivosCommit(
  commit: GitCommit | null,
  repoPath: string | null,
  ramaActual: string | undefined,
  ramaInspeccionada: string | null | undefined,
) {
  const [archivosCommit, setArchivosCommit] = useState<GitArchivoCambio[]>([]);
  const [archivosRama, setArchivosRama] = useState<GitArchivoCambio[]>([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);

  useEffect(() => {
    if (!commit || !repoPath) {
      setArchivosCommit([]);
      setArchivosRama([]);
      return;
    }
    let vivo = true;
    setCargandoArchivos(true);
    const necesitaRama = !!(ramaInspeccionada && ramaActual && ramaInspeccionada !== ramaActual);
    void Promise.all([
      httpGitApi.getArchivosCommit(repoPath, commit.hash),
      necesitaRama
        ? httpGitApi.getArchivosEntreRefs(repoPath, ramaActual, ramaInspeccionada!)
        : Promise.resolve([] as GitArchivoCambio[]),
    ]).then(
      ([delCommit, entre]) => {
        if (!vivo) return;
        setArchivosCommit(delCommit);
        setArchivosRama(entre);
      },
      () => {
        if (!vivo) return;
        setArchivosCommit([]);
        setArchivosRama([]);
      },
    ).finally(() => {
      if (vivo) setCargandoArchivos(false);
    });
    return () => { vivo = false; };
  }, [commit?.hash, repoPath, ramaInspeccionada, ramaActual]);

  return { archivosCommit, archivosRama, cargandoArchivos };
}

export const CommitDetailsModal: React.FC<CommitDetailsModalProps> = ({
  commit,
  repoPath,
  ramaActual,
  ramaInspeccionada,
  onClose,
  onCheckout,
  onInspeccionarArchivo,
}) => {
  const { archivosCommit, archivosRama, cargandoArchivos } = useArchivosCommit(
    commit, repoPath, ramaActual, ramaInspeccionada,
  );

  if (!commit) return null;

  const nombreRama = ramaInspeccionada?.replace(/^remotes\//, '');
  const checkoutTarget = ramaInspeccionada || commit.hash;
  const checkoutEsActual = Boolean(ramaInspeccionada && ramaActual && ramaInspeccionada === ramaActual);

  return (
    <Portal>
      <button
        type="button"
        className="fixed inset-0 z-[35] bg-void/60 backdrop-blur-[2px] max-lg:top-14 lg:hidden"
        aria-label="Cerrar inspector"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 max-lg:top-14 right-0 w-full max-w-sm sm:max-w-md bg-surface-container-low border-l border-outline-variant shadow-2xl z-40 flex flex-col font-mono"
        aria-labelledby="titulo-inspector-commit"
      >
        <CabeceraInspector commit={commit} nombreRama={nombreRama} onClose={onClose} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <DetallesCommit commit={commit} />

          {cargandoArchivos ? (
            <p className="text-code-sm text-on-surface-variant">Cargando archivos…</p>
          ) : (
            <>
              <ListaArchivos
                titulo="Archivos en este commit"
                archivos={archivosCommit}
                onElegir={(archivo) => onInspeccionarArchivo(archivo.path, { commit: commit.hash })}
              />
              {ramaInspeccionada && ramaActual && ramaInspeccionada !== ramaActual ? (
                <ListaArchivos
                  titulo={`Cambios respecto a ${ramaActual}`}
                  archivos={archivosRama}
                  onElegir={(archivo) =>
                    onInspeccionarArchivo(archivo.path, { desde: ramaActual, hasta: ramaInspeccionada })
                  }
                />
              ) : null}
            </>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant bg-surface-container shrink-0">
          <button
            type="button"
            onClick={() => onCheckout(checkoutTarget)}
            disabled={checkoutEsActual}
            className={cn(ui.btnPrimario, 'w-full py-2 font-semibold')}
          >
            {nombreRama ? `Checkout ${nombreRama}` : 'Checkout a este commit'}
          </button>
        </div>
      </aside>
    </Portal>
  );
};

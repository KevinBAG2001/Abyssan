import React, { useEffect, useState } from 'react';
import { GitCommit, GitArchivoCambio } from '../types/git';
import { GitCommit as GitCommitIcon, User, Calendar, Hash, Copy, Check, GitBranch, X, FileText } from 'lucide-react';
import { ChipRama } from './ui/chip-rama';
import { Portal } from './ui/portal';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';

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

export const CommitDetailsModal: React.FC<CommitDetailsModalProps> = ({
  commit,
  repoPath,
  ramaActual,
  ramaInspeccionada,
  onClose,
  onCheckout,
  onInspeccionarArchivo,
}) => {
  const [copiado, setCopiado] = useState(false);
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
    void (async () => {
      try {
        const delCommit = await httpGitApi.getArchivosCommit(repoPath, commit.hash);
        if (!vivo) return;
        setArchivosCommit(delCommit);
        const compararRama =
          ramaInspeccionada && ramaActual && ramaInspeccionada !== ramaActual ? ramaInspeccionada : null;
        if (compararRama) {
          const entre = await httpGitApi.getArchivosEntreRefs(repoPath, ramaActual, compararRama);
          if (!vivo) return;
          setArchivosRama(entre);
        } else {
          setArchivosRama([]);
        }
      } catch {
        if (vivo) {
          setArchivosCommit([]);
          setArchivosRama([]);
        }
      } finally {
        if (vivo) setCargandoArchivos(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [commit?.hash, repoPath, ramaInspeccionada, ramaActual]);

  if (!commit) return null;

  const nombreRama = ramaInspeccionada?.replace(/^remotes\//, '');
  const fecha = commit.date ? new Date(commit.date).toLocaleString() : '—';
  const checkoutTarget = ramaInspeccionada || commit.hash;
  const checkoutEsActual = Boolean(ramaInspeccionada && ramaActual && ramaInspeccionada === ramaActual);

  const copiarHash = async () => {
    try {
      await navigator.clipboard.writeText(commit.hash);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  };

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
      <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-high/50 flex items-start justify-between gap-2 shrink-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-container/15 flex items-center justify-center shrink-0">
            <GitCommitIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 id="titulo-inspector-commit" className="text-headline-sm text-on-surface">
              {nombreRama ? `Rama ${nombreRama}` : 'Inspector de commit'}
            </h2>
            <p className="text-code-sm text-primary font-mono mt-0.5">{commit.shortHash}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className={ui.btnIcono} aria-label="Cerrar inspector">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className={cn(ui.panelInset, 'p-3')}>
          <span className={cn(ui.labelCaps, 'block mb-1.5')}>Mensaje</span>
          <p className="text-code-sm text-on-surface font-medium whitespace-pre-wrap leading-relaxed">
            {commit.message}
          </p>
        </div>

        <div className={cn(ui.panelInset, 'p-3 space-y-3')}>
          <div className="flex items-start gap-2">
            <Hash className="w-4 h-4 text-on-surface-variant/70 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className={cn(ui.labelCaps, 'block mb-1')}>Hash completo</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-code-sm text-primary select-all break-all">{commit.hash}</span>
                <button
                  type="button"
                  onClick={() => void copiarHash()}
                  className={ui.btnIcono}
                  title="Copiar hash"
                  aria-label="Copiar hash"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {commit.authorName ? (
            <div className="flex items-start gap-2 text-code-sm text-on-surface-variant">
              <User className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className={cn(ui.labelCaps, 'block mb-0.5')}>Autor</span>
                <span className="text-on-surface">{commit.authorName}</span>
                <span className="block text-on-surface-variant/70 truncate">{commit.authorEmail}</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-code-sm text-on-surface-variant">
            <Calendar className="w-4 h-4 shrink-0" />
            <div>
              <span className={cn(ui.labelCaps, 'block mb-0.5')}>Fecha</span>
              <span>{fecha}</span>
            </div>
          </div>

          {commit.parents.length > 0 && (
            <div className="pt-2 border-t border-outline-variant">
              <span className={cn(ui.labelCaps, 'block mb-1 opacity-80')}>
                Padres ({commit.parents.length})
              </span>
              <div className="space-y-1">
                {commit.parents.map((p) => (
                  <span key={p} className="font-mono text-code-sm text-secondary block truncate select-all">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {(commit.branches?.length || commit.tags?.length) ? (
          <div className="space-y-3">
            {commit.branches && commit.branches.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <span className={ui.labelCaps}>Ramas</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {commit.branches.map((b) => (
                    <ChipRama key={b} nombre={b} tipo="rama" />
                  ))}
                </div>
              </div>
            )}

            {commit.tags && commit.tags.length > 0 && (
              <div>
                <span className={cn(ui.labelCaps, 'block mb-1.5')}>Tags</span>
                <div className="flex flex-wrap gap-1">
                  {commit.tags.map((t) => (
                    <ChipRama key={t} nombre={t} tipo="tag" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

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

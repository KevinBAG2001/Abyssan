import React, { useState } from 'react';
import { GitCommit as GitCommitIcon, User, Calendar, Hash, Copy, Check, GitBranch, X } from 'lucide-react';
import { GitCommit } from '../../types/git';
import { ChipRama } from '../ui/chip-rama';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';

interface InfoCommitProps {
  commit: GitCommit;
  nombreRama: string | undefined;
  onClose: () => void;
}

export const CabeceraInspector: React.FC<InfoCommitProps> = ({ commit, nombreRama, onClose }) => (
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
);

export function DetallesCommit({ commit }: { commit: GitCommit }) {
  const [copiado, setCopiado] = useState(false);
  const fecha = commit.date ? new Date(commit.date).toLocaleString() : '—';

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
    <>
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
    </>
  );
}

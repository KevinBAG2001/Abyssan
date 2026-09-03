import React from 'react';
import { GitCommit } from '../types/git';
import { X, GitCommit as GitCommitIcon, User, Calendar, GitBranch, Tag, Hash } from 'lucide-react';

interface CommitDetailsModalProps {
  commit: GitCommit | null;
  onClose: () => void;
  onCheckout: (hash: string) => void;
}

export const CommitDetailsModal: React.FC<CommitDetailsModalProps> = ({
  commit,
  onClose,
  onCheckout,
}) => {
  if (!commit) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-container-low border-l border-outline-variant shadow-2xl z-40 flex flex-col">
      {/* Encabezado del Modal */}
      <div className="p-4 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitCommitIcon className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm text-on-surface">Detalles del Commit</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Mensaje */}
        <div className="bg-surface-container-high p-3 rounded-lg border border-outline-variant">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Mensaje</span>
          <p className="text-on-surface font-medium whitespace-pre-wrap">{commit.message}</p>
        </div>

        {/* Metadatos */}
        <div className="space-y-2.5 bg-surface-container-high p-3 rounded-lg border border-outline-variant">
          <div className="flex items-center space-x-2 text-on-surface-variant">
            <Hash className="w-4 h-4 text-on-surface-variant/70 shrink-0" />
            <span className="font-mono text-primary select-all">{commit.hash}</span>
          </div>

          <div className="flex items-center space-x-2 text-on-surface-variant">
            <User className="w-4 h-4 text-on-surface-variant/70 shrink-0" />
            <span>
              {commit.authorName} <span className="text-on-surface-variant/70">({commit.authorEmail})</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-on-surface-variant">
            <Calendar className="w-4 h-4 text-on-surface-variant/70 shrink-0" />
            <span>{new Date(commit.date).toLocaleString()}</span>
          </div>

          {commit.parents.length > 0 && (
            <div className="pt-2 border-t border-outline-variant">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 block mb-1">
                Padres ({commit.parents.length})
              </span>
              <div className="space-y-1">
                {commit.parents.map((p) => (
                  <span key={p} className="font-mono text-[11px] text-secondary block truncate select-all">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Badges de Ramas y Tags */}
        {(commit.branches?.length || commit.tags?.length) ? (
          <div className="space-y-2">
            {commit.branches && commit.branches.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Ramas</span>
                <div className="flex flex-wrap gap-1">
                  {commit.branches.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-primary-container/20 text-primary border border-primary/30 font-medium"
                    >
                      <GitBranch className="w-3 h-3" />
                      <span>{b}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {commit.tags && commit.tags.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {commit.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-ember/20 text-ember border border-ember/30 font-medium"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Acciones del Commit */}
      <div className="p-4 border-t border-outline-variant bg-surface-container">
        <button
          onClick={() => onCheckout(commit.hash)}
          className="w-full py-2 bg-surface-container-highest hover:bg-[#2e354e] text-on-surface font-semibold text-xs rounded-md transition-colors"
        >
          Checkout a este Commit
        </button>
      </div>
    </div>
  );
};

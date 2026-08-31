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
    <div className="fixed inset-y-0 right-0 w-96 bg-[#141724] border-l border-[#23283b] shadow-2xl z-40 flex flex-col">
      {/* Encabezado del Modal */}
      <div className="p-4 border-b border-[#23283b] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitCommitIcon className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm text-white">Detalles del Commit</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Mensaje */}
        <div className="bg-[#1b1f30] p-3 rounded-lg border border-[#2e354e]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mensaje</span>
          <p className="text-slate-200 font-medium whitespace-pre-wrap">{commit.message}</p>
        </div>

        {/* Metadatos */}
        <div className="space-y-2.5 bg-[#1b1f30] p-3 rounded-lg border border-[#2e354e]">
          <div className="flex items-center space-x-2 text-slate-300">
            <Hash className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-mono text-emerald-400 select-all">{commit.hash}</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-300">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {commit.authorName} <span className="text-slate-500">({commit.authorEmail})</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{new Date(commit.date).toLocaleString()}</span>
          </div>

          {commit.parents.length > 0 && (
            <div className="pt-2 border-t border-[#2e354e]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Padres ({commit.parents.length})
              </span>
              <div className="space-y-1">
                {commit.parents.map((p) => (
                  <span key={p} className="font-mono text-[11px] text-sky-400 block truncate select-all">
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ramas</span>
                <div className="flex flex-wrap gap-1">
                  {commit.branches.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium"
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {commit.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"
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
      <div className="p-4 border-t border-[#23283b] bg-[#10131e]">
        <button
          onClick={() => onCheckout(commit.hash)}
          className="w-full py-2 bg-[#23283b] hover:bg-[#2e354e] text-white font-semibold text-xs rounded-md transition-colors"
        >
          Checkout a este Commit
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileCode,
  FilePlus,
  FileEdit,
  FileX,
  Plus,
  Minus,
  Send,
  AlertCircle,
  Layers,
  Split,
} from 'lucide-react';
import { GitFileStatus, GitRepoStatus } from '../types/git';

interface StagingPanelProps {
  status: GitRepoStatus | null;
  selectedFile: GitFileStatus | null;
  loading: boolean;
  onSelectFile: (file: GitFileStatus) => void;
  onStageFile: (filePath: string) => void;
  onStageAll: () => void;
  onUnstageFile: (filePath: string) => void;
  onCommit: (message: string, description?: string) => void;
  onOpenConflictResolver: (filePath: string) => void;
}

export const StagingPanel: React.FC<StagingPanelProps> = ({
  status,
  selectedFile,
  loading,
  onSelectFile,
  onStageFile,
  onStageAll,
  onUnstageFile,
  onCommit,
  onOpenConflictResolver,
}) => {
  const [commitSummary, setCommitSummary] = useState('');
  const [commitDescription, setCommitDescription] = useState('');

  const unstagedFiles = status?.files.filter((f) => !f.staged) || [];
  const stagedFiles = status?.files.filter((f) => f.staged) || [];

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commitSummary.trim()) {
      onCommit(commitSummary.trim(), commitDescription.trim() || undefined);
      setCommitSummary('');
      setCommitDescription('');
    }
  };

  const getStatusIcon = (fileStatus: GitFileStatus['status']) => {
    switch (fileStatus) {
      case 'added':
      case 'untracked':
        return <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'modified':
        return <FileEdit className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'deleted':
        return <FileX className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'conflicted':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="w-80 bg-[#141724] border-l border-[#23283b] flex flex-col h-full select-none">
      {/* Encabezado Staging */}
      <div className="p-3 border-b border-[#23283b] flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Área de Staging ({unstagedFiles.length + stagedFiles.length})
          </span>
        </div>
        {unstagedFiles.length > 0 && (
          <button
            onClick={onStageAll}
            disabled={loading}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
          >
            Stage Todo
          </button>
        )}
      </div>

      {/* Listas de Archivos: Unstaged y Staged */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Unstaged / Conflictos */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <span>Sin Preparar ({unstagedFiles.length})</span>
          </div>

          {unstagedFiles.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-1 italic">No hay cambios pendientes</div>
          ) : (
            <div className="space-y-1">
              {unstagedFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path && !selectedFile.staged;
                const isConflicted = file.status === 'conflicted';

                return (
                  <div
                    key={`unstaged-${file.path}`}
                    onClick={() => {
                      if (isConflicted) {
                        onOpenConflictResolver(file.path);
                      } else {
                        onSelectFile(file);
                      }
                    }}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isConflicted
                        ? 'bg-rose-950/20 text-rose-300 border border-rose-500/30'
                        : isSelected
                        ? 'bg-[#1e2337] text-white border border-[#2e354e]'
                        : 'text-slate-300 hover:bg-[#1b1f30]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      {getStatusIcon(file.status)}
                      <span className="truncate">{file.path}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {isConflicted ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConflictResolver(file.path);
                          }}
                          className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold text-[10px] rounded flex items-center space-x-1 transition-colors"
                          title="Resolver conflicto de fusión"
                        >
                          <Split className="w-2.5 h-2.5" />
                          <span>Resolver</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageFile(file.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all"
                          title="Mover a Staging"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staged */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1.5">
            <span>Preparados para Commit ({stagedFiles.length})</span>
          </div>

          {stagedFiles.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-1 italic">Ningún archivo en staging</div>
          ) : (
            <div className="space-y-1">
              {stagedFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path && selectedFile.staged;
                return (
                  <div
                    key={`staged-${file.path}`}
                    onClick={() => onSelectFile(file)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1e2337] text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#1b1f30]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      {getStatusIcon(file.status)}
                      <span className="truncate">{file.path}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnstageFile(file.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-all"
                      title="Quitar de Staging"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formulario de Commit */}
      <div className="p-3 border-t border-[#23283b] bg-[#10131e]">
        <form onSubmit={handleCommitSubmit} className="space-y-2">
          <input
            type="text"
            value={commitSummary}
            onChange={(e) => setCommitSummary(e.target.value)}
            placeholder="Mensaje de commit (resumen)..."
            className="w-full bg-[#1b1f30] border border-[#2e354e] rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <textarea
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            rows={2}
            placeholder="Descripción extendida (opcional)..."
            className="w-full bg-[#1b1f30] border border-[#2e354e] rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <button
            type="submit"
            disabled={!commitSummary.trim() || stagedFiles.length === 0 || loading}
            className="w-full flex items-center justify-center space-x-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs rounded-md shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Commit ({stagedFiles.length} archivos)</span>
          </button>
        </form>
      </div>
    </div>
  );
};

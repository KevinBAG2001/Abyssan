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
  Trash2,
  Ban,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { GitFileStatus, GitRepoStatus } from '../types/git';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

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
  onDiscardFile: (filePath: string) => void;
  onAbortMerge: () => void;
  onContinuarMerge: () => void;
  onAmend: (message: string) => void;
}

function iconoEstadoArchivo(fileStatus: GitFileStatus['status']) {
  switch (fileStatus) {
    case 'added':
    case 'untracked':
      return <FilePlus className="w-3.5 h-3.5 text-primary shrink-0" />;
    case 'modified':
      return <FileEdit className="w-3.5 h-3.5 text-ember shrink-0" />;
    case 'deleted':
      return <FileX className="w-3.5 h-3.5 text-error shrink-0" />;
    case 'conflicted':
      return <AlertCircle className="w-3.5 h-3.5 text-magma animate-pulse shrink-0" />;
    default:
      return <FileCode className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />;
  }
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
  onDiscardFile,
  onAbortMerge,
  onContinuarMerge,
  onAmend,
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

  return (
    <div className="w-staging min-w-[220px] max-w-[420px] shrink-0 bg-surface-container-low border-l border-outline-variant flex flex-col h-full select-none overflow-hidden max-xl:min-w-[200px]">
      {status?.isMerging && (
        <div className="px-3 py-2.5 bg-error-container/20 border-b border-error/30 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-label-md font-semibold">Fusión en progreso</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onContinuarMerge}
              disabled={loading}
              className={cn(ui.btnPrimario, 'flex-1 py-1 text-label-md')}
            >
              <CheckCircle2 className="w-3 h-3" />
              Continuar
            </button>
            <button
              onClick={onAbortMerge}
              disabled={loading}
              className={cn(ui.btnDestructivo, 'flex-1 py-1 text-label-md')}
            >
              <Ban className="w-3 h-3" />
              Abortar
            </button>
          </div>
        </div>
      )}

      <div className="px-3 py-2.5 border-b border-outline-variant flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span className={cn(ui.labelCaps, 'truncate')}>
            Staging ({unstagedFiles.length + stagedFiles.length})
          </span>
        </div>
        {unstagedFiles.length > 0 && (
          <button
            onClick={onStageAll}
            disabled={loading}
            className="text-label-md font-medium text-primary hover:text-primary-fixed shrink-0 transition-colors"
          >
            Preparar todo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={ui.labelCaps}>Sin preparar ({unstagedFiles.length})</span>
          </div>

          {unstagedFiles.length === 0 ? (
            <div className="text-code-sm text-on-surface-variant/60 py-1 italic">No hay cambios pendientes</div>
          ) : (
            <div className={cn(ui.panelInset, 'divide-y divide-outline-variant/50')}>
              {unstagedFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path && !selectedFile.staged;
                const isConflicted = file.status === 'conflicted';

                return (
                  <div
                    key={`unstaged-${file.path}`}
                    className={cn(
                      'group flex items-center justify-between px-2 py-1.5 text-label-md transition-colors',
                      isConflicted
                        ? 'bg-error/10 text-error border-l-2 border-error'
                        : isSelected
                          ? 'bg-surface-container-high text-on-surface'
                          : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isConflicted) onOpenConflictResolver(file.path);
                        else onSelectFile(file);
                      }}
                      className="flex items-center gap-2 truncate pr-2 text-left min-w-0 flex-1"
                    >
                      {iconoEstadoArchivo(file.status)}
                      <span className="truncate font-mono text-code-sm">{file.path}</span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {isConflicted ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConflictResolver(file.path);
                          }}
                          className="px-2 py-0.5 bg-magma hover:brightness-110 text-void font-bold text-[10px] rounded flex items-center gap-1 transition-colors"
                          title="Resolver conflicto"
                        >
                          <Split className="w-2.5 h-2.5" />
                          Resolver
                        </button>
                      ) : (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDiscardFile(file.path);
                            }}
                            className="p-1 hover:bg-error/20 text-error rounded"
                            title="Descartar cambios"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStageFile(file.path);
                            }}
                            className="p-1 hover:bg-primary/20 text-primary rounded"
                            title="Mover a staging"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn(ui.labelCaps, 'text-primary')}>Preparados ({stagedFiles.length})</span>
          </div>

          {stagedFiles.length === 0 ? (
            <div className="text-code-sm text-on-surface-variant/60 py-1 italic">Ningún archivo en staging</div>
          ) : (
            <div className={cn(ui.panelInset, 'border-primary/30 bg-surface-container-high/30 divide-y divide-outline-variant/50')}>
              {stagedFiles.map((file) => {
                const isSelected = selectedFile?.path === file.path && selectedFile.staged;
                return (
                  <div
                    key={`staged-${file.path}`}
                    className={cn(
                      'group flex items-center justify-between px-2 py-1.5 text-label-md transition-colors',
                      isSelected ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectFile(file)}
                      className="flex items-center gap-2 truncate pr-2 text-left min-w-0 flex-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {iconoEstadoArchivo(file.status)}
                      <span className="truncate font-mono text-code-sm">{file.path}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnstageFile(file.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/20 text-error rounded transition-opacity shrink-0"
                      title="Quitar de staging"
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

      <div className="p-3 border-t border-outline-variant bg-surface-container shrink-0">
        <form
          onSubmit={handleCommitSubmit}
          className="space-y-2"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleCommitSubmit(e);
          }}
        >
          <label htmlFor="abyssan-commit-input" className="block text-label-caps text-on-surface-variant">
            Mensaje de commit
          </label>
          <input
            id="abyssan-commit-input"
            type="text"
            value={commitSummary}
            onChange={(e) => setCommitSummary(e.target.value)}
            placeholder="Asunto del commit…"
            className={ui.inputUnderline}
          />
          <label htmlFor="abyssan-commit-desc" className="block text-label-caps text-on-surface-variant">
            Descripción (opcional)
          </label>
          <textarea
            id="abyssan-commit-desc"
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            rows={2}
            placeholder="Descripción ampliada…"
            className={cn(ui.input, 'resize-none')}
          />
          <div className="flex gap-1.5 pt-1">
            <button
              type="submit"
              disabled={!commitSummary.trim() || stagedFiles.length === 0 || loading}
              className={cn(ui.btnPrimario, 'flex-1 py-2 font-semibold')}
            >
              <Send className="w-3.5 h-3.5" />
              Confirmar ({stagedFiles.length})
            </button>
            <button
              type="button"
              disabled={!commitSummary.trim() || loading}
              onClick={() => onAmend(commitSummary.trim())}
              className={ui.btnSecundario}
              title="Enmendar el último commit"
              aria-label="Enmendar el último commit"
            >
              <Pencil className="w-3.5 h-3.5 text-ember" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

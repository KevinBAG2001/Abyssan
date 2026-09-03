import { Sidebar } from '../Sidebar';
import { CommitGraph } from '../CommitGraph';
import { StagingPanel } from '../StagingPanel';
import { DiffViewer } from '../DiffViewer';
import { ConflictResolver } from '../ConflictResolver';
import type { GitBranch, GitCommit, GitConflictData, GitFileStatus, GitRepoStatus, GitTag } from '../../types/git';

type AreaTrabajoGitProps = {
  branches: GitBranch[];
  tags: GitTag[];
  commits: GitCommit[];
  status: GitRepoStatus | null;
  selectedFile: GitFileStatus | null;
  selectedCommit: GitCommit | null;
  currentDiff: string;
  conflictData: GitConflictData | null;
  loading: boolean;
  headDesvinculado?: boolean;
  ramaActual: string;
  onCheckout: (target: string) => void;
  onCreateBranch: (name: string) => void;
  onCreateTag: (name: string) => void;
  onDeleteBranch: (name: string) => void;
  onRenameBranch: (actual: string, nuevo: string) => void;
  onSelectCommit: (commit: GitCommit | null) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
  onSelectFile: (file: GitFileStatus) => void;
  onStageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageFile: (path: string) => void;
  onCommit: (message: string, description?: string) => void;
  onOpenConflictResolver: (path: string) => void;
  onDiscardFile: (path: string) => void;
  onAbortMerge: () => void;
  onContinuarMerge: () => void;
  onAmend: (message: string) => void;
  onCerrarDiff: () => void;
  onCancelarConflicto: () => void;
  onResolveConflict: (content: string) => void;
};

export function AreaTrabajoGit({
  branches,
  tags,
  commits,
  status,
  selectedFile,
  selectedCommit,
  currentDiff,
  conflictData,
  loading,
  headDesvinculado = false,
  ramaActual,
  onCheckout,
  onCreateBranch,
  onCreateTag,
  onDeleteBranch,
  onRenameBranch,
  onSelectCommit,
  onContextMenu,
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
  onCerrarDiff,
  onCancelarConflicto,
  onResolveConflict,
}: AreaTrabajoGitProps) {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0 min-w-0 max-xl:overflow-x-auto">
      <Sidebar
        branches={branches}
        tags={tags}
        currentBranch={ramaActual}
        loading={loading}
        headDesvinculado={headDesvinculado}
        onCheckout={onCheckout}
        onCreateBranch={onCreateBranch}
        onCreateTag={onCreateTag}
        onDeleteBranch={onDeleteBranch}
        onRenameBranch={onRenameBranch}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest relative overflow-hidden">
        {conflictData ? (
          <ConflictResolver
            key={conflictData.filePath}
            conflictData={conflictData}
            loading={loading}
            isMerging={status?.isMerging}
            onResolve={onResolveConflict}
            onCancel={onCancelarConflicto}
            onAbortMerge={onAbortMerge}
          />
        ) : selectedFile ? (
          <div className="flex-1 flex flex-col h-full min-w-0">
            <div className="h-8 bg-surface-container border-b border-outline-variant px-3 sm:px-4 flex items-center justify-between text-code-sm shrink-0">
              <span className="text-on-surface-variant truncate">Inspeccionando archivo</span>
              <button
                type="button"
                onClick={onCerrarDiff}
                className="text-code-sm text-primary hover:underline shrink-0 ml-2"
              >
                Volver al grafo
              </button>
            </div>
            <DiffViewer diff={currentDiff} filePath={selectedFile.path} isStaged={selectedFile.staged} />
          </div>
        ) : (
          <CommitGraph
            commits={commits}
            selectedCommit={selectedCommit}
            currentBranch={ramaActual}
            onSelectCommit={onSelectCommit}
            onContextMenu={onContextMenu}
          />
        )}
      </main>

      <StagingPanel
        status={status}
        selectedFile={selectedFile}
        loading={loading}
        onSelectFile={onSelectFile}
        onStageFile={onStageFile}
        onStageAll={onStageAll}
        onUnstageFile={onUnstageFile}
        onCommit={onCommit}
        onOpenConflictResolver={onOpenConflictResolver}
        onDiscardFile={onDiscardFile}
        onAbortMerge={onAbortMerge}
        onContinuarMerge={onContinuarMerge}
        onAmend={onAmend}
      />
    </div>
  );
}

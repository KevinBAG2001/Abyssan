import { useEffect, useState } from 'react';
import { Sidebar } from '../Sidebar';
import { CommitGraph } from '../CommitGraph';
import { StagingPanel } from '../StagingPanel';
import { DiffViewer } from '../DiffViewer';
import { ConflictResolver } from '../ConflictResolver';
import type { GitBranch, GitCommit, GitConflictData, GitFileStatus, GitRepoStatus, GitTag } from '../../types/git';
import type { InteligenciaGrafo } from '../../lib/semantica-grafo';
import { BarraNavegacionMovil, type PanelMovil } from './BarraNavegacionMovil';

const REMOTOS_VACIOS: string[] = [];

type AreaTrabajoGitProps = {
  selectedRepo?: string | null;
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
  ramaInspeccionada?: string | null;
  nombresRemotos?: string[];
  inteligenciaGrafo?: InteligenciaGrafo;
  onCheckout: (target: string) => void;
  onInspectarRama: (branch: GitBranch) => void;
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

export function AreaTrabajoGit(props: AreaTrabajoGitProps) {
  const {
    selectedRepo,
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
    ramaInspeccionada = null,
    nombresRemotos = REMOTOS_VACIOS,
    inteligenciaGrafo,
    onCheckout,
    onInspectarRama,
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
  } = props;

  const [panelMovil, setPanelMovil] = useState<PanelMovil>('historial');

  useEffect(() => {
    if (selectedFile || conflictData) setPanelMovil('historial');
  }, [selectedFile, conflictData]);

  const sidebar = (
    <Sidebar
      branches={branches}
      tags={tags}
      currentBranch={ramaActual}
      loading={loading}
      headDesvinculado={headDesvinculado}
      ramaInspeccionada={ramaInspeccionada}
      onCheckout={onCheckout}
      onInspectarRama={onInspectarRama}
      onCreateBranch={onCreateBranch}
      onCreateTag={onCreateTag}
      onDeleteBranch={onDeleteBranch}
      onRenameBranch={onRenameBranch}
    />
  );

  const staging = (
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
  );

  const mainProps = {
    conflictData,
    loading,
    status,
    selectedFile,
    currentDiff,
    onCerrarDiff,
    onResolveConflict,
    onCancelarConflicto,
    onAbortMerge,
    commits,
    selectedCommit,
    ramaActual,
    selectedRepo,
    nombresRemotos,
    inteligenciaGrafo,
    onSelectCommit,
    onContextMenu,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)_minmax(240px,320px)]">
        {sidebar}
        <PanelPrincipal {...mainProps} />
        {staging}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        {panelMovil === 'ramas' && (
          <Sidebar
            {...{
              branches,
              tags,
              currentBranch: ramaActual,
              loading,
              headDesvinculado,
              ramaInspeccionada,
              onCheckout,
              onInspectarRama,
              onCreateBranch,
              onCreateTag,
              onDeleteBranch,
              onRenameBranch,
            }}
            className="!w-full !max-w-none flex-1 border-r-0"
          />
        )}
        {panelMovil === 'historial' && <PanelPrincipal {...mainProps} />}
        {panelMovil === 'cambios' && (
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
            className="!w-full !max-w-none flex-1 border-l-0"
          />
        )}
        <BarraNavegacionMovil activo={panelMovil} onCambiar={setPanelMovil} />
      </div>
    </div>
  );
}

type PanelPrincipalProps = {
  conflictData: GitConflictData | null;
  loading: boolean;
  status: GitRepoStatus | null;
  selectedFile: GitFileStatus | null;
  currentDiff: string;
  onCerrarDiff: () => void;
  onResolveConflict: (content: string) => void;
  onCancelarConflicto: () => void;
  onAbortMerge: () => void;
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  ramaActual: string;
  selectedRepo?: string | null;
  nombresRemotos: string[];
  inteligenciaGrafo?: InteligenciaGrafo;
  onSelectCommit: (commit: GitCommit | null) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
};

function PanelPrincipal({
  conflictData,
  loading,
  status,
  selectedFile,
  currentDiff,
  onCerrarDiff,
  onResolveConflict,
  onCancelarConflicto,
  onAbortMerge,
  commits,
  selectedCommit,
  ramaActual,
  selectedRepo,
  nombresRemotos,
  inteligenciaGrafo,
  onSelectCommit,
  onContextMenu,
}: PanelPrincipalProps) {
  return (
    <main
      data-testid="abyssan-main"
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-lowest"
    >
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
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container px-3 text-code-sm sm:px-4">
            <span className="truncate text-on-surface-variant">Inspeccionando archivo</span>
            <button
              type="button"
              onClick={onCerrarDiff}
              className="ml-2 shrink-0 text-code-sm text-primary hover:underline"
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
          selectedRepo={selectedRepo}
          nombresRemotos={nombresRemotos}
          inteligencia={inteligenciaGrafo}
          onSelectCommit={onSelectCommit}
          onContextMenu={onContextMenu}
        />
      )}
    </main>
  );
}

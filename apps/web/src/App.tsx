import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommitGraph } from './components/CommitGraph';
import { StagingPanel } from './components/StagingPanel';
import { DiffViewer } from './components/DiffViewer';
import { ConflictResolver } from './components/ConflictResolver';
import { GitConsoleDrawer } from './components/GitConsoleDrawer';
import { CapaModalesApp } from './components/CapaModalesApp';
import { ModalIdentidadGit } from './components/ModalIdentidadGit';
import { PanelTimeline } from './components/PanelTimeline';
import { useGitRepository } from './application/hooks/useGitRepository';
import { useMutacionesGit } from './application/hooks/useMutacionesGit';
import { GitCommit } from './types/git';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AccionPaleta } from './components/PaletaComandos';

const CLAVE_PULL = 'abyssan.modoPull';

export const App: React.FC = () => {
  const git = useGitRepository();
  const mut = useMutacionesGit({
    selectedRepo: git.selectedRepo,
    status: git.status,
    conflictData: git.conflictData,
    showToast: git.showToast,
    refreshRepoData: git.refreshRepoData,
    setSelectedFile: git.setSelectedFile,
    setCurrentDiff: git.setCurrentDiff,
    setConflictData: git.setConflictData,
  });

  const [isStashModalOpen, setIsStashModalOpen] = useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [nacimientoAbierto, setNacimientoAbierto] = useState(false);
  const [forjasAbiertas, setForjasAbiertas] = useState(false);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [identidadAbierta, setIdentidadAbierta] = useState(false);
  const [timelineAbierta, setTimelineAbierta] = useState(false);
  const [modoPull, setModoPull] = useState<'merge' | 'rebase'>(
    () => (localStorage.getItem(CLAVE_PULL) as 'merge' | 'rebase') || 'merge'
  );
  const [contextMenu, setContextMenu] = useState<{
    commit: GitCommit;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (git.operaciones.some((o) => o.estado === 'en_cola' || o.estado === 'corriendo')) {
      setIsConsoleOpen(true);
    }
  }, [git.operaciones]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('oauth') === 'ok') git.showToast('Cuenta de forja conectada', 'success');
    if (q.get('oauth') === 'error') git.showToast('OAuth falló. Revisa las credenciales de la forja.', 'error');
    if (q.has('oauth')) window.history.replaceState({}, '', window.location.pathname);
  }, [git.showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        void mut.handleStageAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setPaletaAbierta(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mut.handleStageAll]);

  const onPaleta = (accion: AccionPaleta) => {
    if (accion === 'fetch') void mut.handleFetch();
    if (accion === 'pull') void mut.handlePull(modoPull);
    if (accion === 'push') void mut.handlePush();
    if (accion === 'commit') document.getElementById('abyssan-commit-input')?.focus();
    if (accion === 'forjas') setForjasAbiertas(true);
  };

  const ramaActual = git.status?.currentBranch || 'HEAD';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans">
      {contextMenu && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          aria-label="Cerrar menú contextual"
          onClick={() => setContextMenu(null)}
        />
      )}
      {git.toast && (
        <div
          className={`fixed bottom-12 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold border ${
            git.toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/95 text-rose-300 border-rose-500/40'
          }`}
        >
          {git.toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{git.toast.message}</span>
        </div>
      )}

      <Header
        repos={git.repos}
        selectedRepo={git.selectedRepo}
        status={git.status}
        loading={git.loading}
        cargandoRepos={git.cargandoRepos}
        onSelectRepo={git.setSelectedRepo}
        onPull={() => void mut.handlePull(modoPull)}
        onPush={() => void mut.handlePush()}
        onRefresh={() => git.selectedRepo && git.refreshRepoData(git.selectedRepo)}
        onOpenStashModal={() => setIsStashModalOpen(true)}
        onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        onFetch={() => void mut.handleFetch()}
        onOpenNacimiento={() => setNacimientoAbierto(true)}
        onOpenForjas={() => setForjasAbiertas(true)}
        onDeshacer={() => void mut.handleDeshacer()}
        onOpenTimeline={() => setTimelineAbierta(true)}
        onOpenIdentidad={() => setIdentidadAbierta(true)}
        modoPull={modoPull}
        onCambiarModoPull={(modo) => {
          setModoPull(modo);
          localStorage.setItem(CLAVE_PULL, modo);
        }}
        puedeDeshacer={Boolean(mut.ultimaOp.puedeDeshacer)}
        motivoDeshacer={mut.ultimaOp.motivoBloqueo}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          branches={git.branches}
          tags={git.tags}
          currentBranch={ramaActual}
          loading={git.loading}
          onCheckout={mut.handleCheckout}
          onCreateBranch={(name) => mut.handleCreateBranch(name)}
          onCreateTag={(name) => mut.handleCreateTag(name)}
          onDeleteBranch={mut.handleDeleteBranch}
          onRenameBranch={mut.handleRenameBranch}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-[#0f111a] relative">
          {git.conflictData ? (
            <ConflictResolver
              key={git.conflictData.filePath}
              conflictData={git.conflictData}
              loading={git.loading}
              isMerging={git.status?.isMerging}
              onResolve={mut.handleResolveConflict}
              onCancel={() => git.setConflictData(null)}
              onAbortMerge={mut.handleAbortMerge}
            />
          ) : git.selectedFile ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="h-8 bg-[#181c2d] border-b border-[#23283b] px-4 flex items-center justify-between text-xs">
                <span className="text-slate-400">Inspeccionando archivo modificado</span>
                <button
                  type="button"
                  onClick={() => {
                    git.setSelectedFile(null);
                    git.setCurrentDiff('');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Volver al Grafo de Commits
                </button>
              </div>
              <DiffViewer diff={git.currentDiff} filePath={git.selectedFile.path} isStaged={git.selectedFile.staged} />
            </div>
          ) : (
            <CommitGraph
              commits={git.commits}
              selectedCommit={git.selectedCommit}
              onSelectCommit={git.setSelectedCommit}
              onContextMenu={(commit, position) => setContextMenu({ commit, position })}
            />
          )}
        </main>

        <StagingPanel
          status={git.status}
          selectedFile={git.selectedFile}
          loading={git.loading}
          onSelectFile={mut.handleSelectFile}
          onStageFile={mut.handleStageFile}
          onStageAll={mut.handleStageAll}
          onUnstageFile={mut.handleUnstageFile}
          onCommit={mut.handleCommit}
          onOpenConflictResolver={mut.handleOpenConflictResolver}
          onDiscardFile={mut.handleDiscard}
          onAbortMerge={mut.handleAbortMerge}
          onContinuarMerge={mut.handleContinuarMerge}
          onAmend={mut.handleAmend}
        />
      </div>

      <GitConsoleDrawer
        logs={git.logs}
        operaciones={git.operaciones}
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
        onClear={() => git.setLogs([])}
        reflog={mut.reflog}
      />

      <CapaModalesApp
        selectedRepo={git.selectedRepo}
        selectedCommit={git.selectedCommit}
        currentBranch={ramaActual}
        branches={git.branches}
        stashes={git.stashes}
        remotes={git.remotes}
        loading={git.loading}
        isStashModalOpen={isStashModalOpen}
        isRemoteModalOpen={isRemoteModalOpen}
        isCompareModalOpen={isCompareModalOpen}
        nacimientoAbierto={nacimientoAbierto}
        forjasAbiertas={forjasAbiertas}
        paletaAbierta={paletaAbierta}
        confirmacion={mut.confirmacion}
        contextMenu={contextMenu}
        onCerrarCommit={() => git.setSelectedCommit(null)}
        onCheckout={mut.handleCheckout}
        onSaveStash={mut.handleSaveStash}
        onPopStash={mut.handlePopStash}
        onDropStash={mut.handleDropStash}
        onCerrarStash={() => setIsStashModalOpen(false)}
        onAddRemote={mut.handleAddRemote}
        onRemoveRemote={mut.handleRemoveRemote}
        onFetchAll={mut.handleFetch}
        onCerrarRemote={() => setIsRemoteModalOpen(false)}
        onMerge={mut.handleMerge}
        onCerrarCompare={() => setIsCompareModalOpen(false)}
        onCerrarNacimiento={() => setNacimientoAbierto(false)}
        onClonado={async (path) => {
          git.showToast('Repositorio clonado', 'success');
          setNacimientoAbierto(false);
          await git.loadRepos();
          git.setSelectedRepo(path);
        }}
        onInicializado={async (path) => {
          git.showToast('Repositorio inicializado', 'success');
          setNacimientoAbierto(false);
          await git.loadRepos();
          git.setSelectedRepo(path);
        }}
        onError={(m) => git.showToast(m, 'error')}
        onCerrarForjas={() => setForjasAbiertas(false)}
        onExito={(m) => git.showToast(m, 'success')}
        onCheckoutHecho={() => git.selectedRepo && void git.refreshRepoData(git.selectedRepo)}
        onCerrarContext={() => setContextMenu(null)}
        onCreateBranch={mut.handleCreateBranch}
        onCreateTag={mut.handleCreateTag}
        onCherryPick={mut.handleCherryPick}
        onRevert={mut.handleRevert}
        onReset={mut.handleReset}
        onCancelarConfirmacion={() => mut.setConfirmacion(null)}
        onConfirmar={() => {
          const ejec = mut.confirmacion?.ejecutar;
          mut.setConfirmacion(null);
          void ejec?.().catch((err: unknown) =>
            git.showToast(err instanceof Error ? err.message : 'Error', 'error')
          );
        }}
        onCerrarPaleta={() => setPaletaAbierta(false)}
        onPaleta={onPaleta}
      />

      {timelineAbierta && (
        <PanelTimeline
          abierta={timelineAbierta}
          entradas={mut.journal}
          loading={git.loading}
          onCerrar={() => setTimelineAbierta(false)}
          onDeshacer={(id) => void mut.handleDeshacer(id)}
        />
      )}

      {identidadAbierta && git.selectedRepo && (
        <ModalIdentidadGit
          repoPath={git.selectedRepo}
          onClose={() => setIdentidadAbierta(false)}
          onGuardado={() => git.showToast('Identidad git configurada', 'success')}
          onError={(m) => git.showToast(m, 'error')}
        />
      )}
    </div>
  );
};

export default App;

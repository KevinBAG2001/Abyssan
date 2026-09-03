import React, { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { GitConsoleDrawer } from './components/GitConsoleDrawer';
import { CapaModalesApp } from './components/CapaModalesApp';
import { ModalIdentidadGit } from './components/ModalIdentidadGit';
import { PanelTimeline } from './components/PanelTimeline';
import { ToastNotificacion } from './components/app/ToastNotificacion';
import { AreaTrabajoGit } from './components/app/AreaTrabajoGit';
import { useGitRepository } from './application/hooks/useGitRepository';
import { useMutacionesGit } from './application/hooks/useMutacionesGit';
import { useEfectosAppShell } from './application/hooks/useEfectosAppShell';
import { GitCommit } from './types/git';
import type { AccionPaleta } from './components/PaletaComandos';
import { ui } from './lib/diseno';
import { cn } from './lib/utils';

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
  const [consolaExpandida, setConsolaExpandida] = useState(false);
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

  const abrirConsola = useCallback(() => setIsConsoleOpen(true), []);
  const abrirPaleta = useCallback(() => setPaletaAbierta(true), []);

  useEfectosAppShell({
    operaciones: git.operaciones,
    onAbrirConsola: abrirConsola,
    showToast: git.showToast,
    onStageAll: mut.handleStageAll,
    onAbrirPaleta: abrirPaleta,
  });

  const onPaleta = (accion: AccionPaleta) => {
    if (accion === 'fetch') void mut.handleFetch();
    if (accion === 'pull') void mut.handlePull(modoPull);
    if (accion === 'push') void mut.handlePush();
    if (accion === 'commit') document.getElementById('abyssan-commit-input')?.focus();
    if (accion === 'forjas') setForjasAbiertas(true);
  };

  const alternarConsola = () => {
    if (isConsoleOpen) setConsolaExpandida(false);
    setIsConsoleOpen((abierta) => !abierta);
  };

  const ramaActual = git.status?.currentBranch || 'HEAD';
  const headDesvinculado =
    ramaActual === 'HEAD desvinculado' || /^[0-9a-f]{7,40}$/i.test(ramaActual);
  const ocupado =
    git.loading ||
    mut.mutando ||
    git.operaciones.some((o) => o.estado === 'en_cola' || o.estado === 'corriendo');
  const headShort =
    git.commits[0]?.shortHash ||
    git.branches.find((b) => b.current)?.commit?.slice(0, 7) ||
    undefined;

  return (
    <div className={cn(ui.app, 'h-screen w-screen')}>
      {contextMenu && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          aria-label="Cerrar menú contextual"
          onClick={() => setContextMenu(null)}
        />
      )}
      {git.toast && (
        <ToastNotificacion mensaje={git.toast.message} tipo={git.toast.type} />
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
        onToggleConsole={alternarConsola}
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

      <AreaTrabajoGit
        branches={git.branches}
        tags={git.tags}
        commits={git.commits}
        status={git.status}
        selectedFile={git.selectedFile}
        selectedCommit={git.selectedCommit}
        currentDiff={git.currentDiff}
        conflictData={git.conflictData}
        loading={ocupado}
        headDesvinculado={headDesvinculado}
        ramaActual={ramaActual}
        onCheckout={mut.handleCheckout}
        onCreateBranch={(name) => mut.handleCreateBranch(name)}
        onCreateTag={(name) => mut.handleCreateTag(name)}
        onDeleteBranch={mut.handleDeleteBranch}
        onRenameBranch={mut.handleRenameBranch}
        onSelectCommit={git.setSelectedCommit}
        onContextMenu={(commit, position) => setContextMenu({ commit, position })}
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
        onCerrarDiff={() => {
          git.setSelectedFile(null);
          git.setCurrentDiff('');
        }}
        onCancelarConflicto={() => git.setConflictData(null)}
        onResolveConflict={mut.handleResolveConflict}
      />

      <GitConsoleDrawer
        logs={git.logs}
        operaciones={git.operaciones}
        isOpen={isConsoleOpen}
        expandida={consolaExpandida}
        onToggle={alternarConsola}
        onExpandidaChange={setConsolaExpandida}
        onClear={() => git.setLogs([])}
        reflog={mut.reflog}
        currentBranch={git.selectedRepo ? ramaActual : undefined}
        headShortHash={headShort}
        loading={ocupado}
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

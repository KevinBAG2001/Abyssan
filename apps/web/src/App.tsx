import React from 'react';
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
import { useEstadoAppShell } from './application/hooks/useEstadoAppShell';
import { useSesionInstancia } from './application/hooks/useSesionInstancia';
import { ModalSesionInstancia } from './components/ModalSesionInstancia';
import type { AccionPaleta } from './components/PaletaComandos';
import { PanelExplicacion } from './components/PanelExplicacion';
import { ui } from './lib/diseno';
import { cn } from './lib/utils';
import { esCommitHead } from './lib/grafo-utils';

export const App: React.FC = () => {
  const sesion = useSesionInstancia();
  const git = useGitRepository(sesion.lista);
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

  const shell = useEstadoAppShell({
    commits: git.commits,
    selectedRepo: git.selectedRepo,
    status: git.status,
    selectedCommit: git.selectedCommit,
    setSelectedCommit: git.setSelectedCommit,
    setSelectedFile: git.setSelectedFile,
    setCurrentDiff: git.setCurrentDiff,
    showToast: git.showToast,
    ultimaOp: mut.ultimaOp,
  });

  useEfectosAppShell({
    operaciones: git.operaciones,
    onAbrirConsola: shell.consola.abrirConsola,
    showToast: git.showToast,
    onStageAll: mut.handleStageAll,
    onAbrirPaleta: shell.abrirPaleta,
  });

  const onPaleta = (accion: AccionPaleta) => {
    if (accion === 'fetch') void mut.handleFetch();
    if (accion === 'pull') void mut.handlePull(shell.modoPull);
    if (accion === 'push') void mut.handlePush();
    if (accion === 'commit') document.getElementById('abyssan-commit-input')?.focus();
    if (accion === 'forjas') shell.modales.setForjasAbiertas(true);
  };

  const ramaActual = git.status?.currentBranch || 'HEAD';
  const headDesvinculado =
    ramaActual === 'HEAD desvinculado' || /^[0-9a-f]{7,40}$/i.test(ramaActual);
  const ocupado =
    git.loading ||
    mut.mutando ||
    git.operaciones.some((o) => o.estado === 'en_cola' || o.estado === 'corriendo');
  const commitHead = git.commits.find((c) => esCommitHead(c));
  const headShort =
    commitHead?.shortHash ||
    git.branches.find((b) => b.current)?.commit?.slice(0, 7) ||
    undefined;

  return (
    <div className={cn(ui.app, 'h-screen w-screen')} aria-busy={ocupado || sesion.cargando}>
      <OverlayContextMenu contextMenu={shell.contextMenu} onCerrar={() => shell.setContextMenu(null)} />

      {git.toast && (
        <ToastNotificacion mensaje={git.toast.message} tipo={git.toast.type} />
      )}

      {sesion.requiereToken && !sesion.lista && (
        <ModalSesionInstancia error={sesion.error} cargando={sesion.cargando} onAbrir={sesion.abrir} />
      )}

      {sesion.cargando && !sesion.lista && !sesion.requiereToken && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/40">
          <p className="text-code-sm text-on-surface-variant">Abriendo sesión…</p>
        </div>
      )}

      {shell.explicacionActiva && (
        <PanelExplicacion
          tipo={shell.explicacionActiva.tipo}
          comandoGit={shell.explicacionActiva.comandoGit}
          onCerrar={shell.descartarExplicacion}
        />
      )}

      <Header
        repos={git.repos}
        selectedRepo={git.selectedRepo}
        status={git.status}
        loading={git.loading}
        cargandoRepos={git.cargandoRepos}
        onSelectRepo={git.setSelectedRepo}
        onPull={() => void mut.handlePull(shell.modoPull)}
        onPush={() => void mut.handlePush()}
        onRefresh={() => git.selectedRepo && git.refreshRepoData(git.selectedRepo)}
        onOpenStashModal={() => shell.modales.setIsStashModalOpen(true)}
        onOpenRemoteModal={() => shell.modales.setIsRemoteModalOpen(true)}
        onOpenCompareModal={() => shell.modales.setIsCompareModalOpen(true)}
        onToggleConsole={shell.consola.alternarConsola}
        onFetch={() => void mut.handleFetch()}
        onOpenNacimiento={() => shell.modales.setNacimientoAbierto(true)}
        onOpenForjas={() => shell.modales.setForjasAbiertas(true)}
        onDeshacer={() => void mut.handleDeshacer()}
        onOpenTimeline={() => shell.modales.setTimelineAbierta(true)}
        onOpenIdentidad={() => shell.modales.setIdentidadAbierta(true)}
        modoPull={shell.modoPull}
        onCambiarModoPull={shell.cambiarModoPull}
        puedeDeshacer={Boolean(mut.ultimaOp.puedeDeshacer)}
        motivoDeshacer={mut.ultimaOp.motivoBloqueo}
        modoAprendizaje={shell.modoAprendizaje}
        onCambiarModoAprendizaje={shell.cambiarModoAprendizaje}
      />

      <AreaTrabajoGit
        selectedRepo={git.selectedRepo}
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
        ramaInspeccionada={shell.ramaInspeccionada}
        nombresRemotos={git.remotes.map((r) => r.name)}
        onCheckout={mut.handleCheckout}
        onInspectarRama={shell.inspectarRama}
        onCreateBranch={(name) => mut.handleCreateBranch(name)}
        onCreateTag={(name) => mut.handleCreateTag(name)}
        onDeleteBranch={mut.handleDeleteBranch}
        onRenameBranch={mut.handleRenameBranch}
        onSelectCommit={(commit) => {
          shell.setRamaInspeccionada(null);
          git.setSelectedCommit(commit);
        }}
        onContextMenu={(commit, position) => shell.setContextMenu({ commit, position })}
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
        isOpen={shell.consola.isConsoleOpen}
        expandida={shell.consola.consolaExpandida}
        onToggle={shell.consola.alternarConsola}
        onExpandidaChange={shell.consola.setConsolaExpandida}
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
        isStashModalOpen={shell.modales.isStashModalOpen}
        isRemoteModalOpen={shell.modales.isRemoteModalOpen}
        isCompareModalOpen={shell.modales.isCompareModalOpen}
        nacimientoAbierto={shell.modales.nacimientoAbierto}
        forjasAbiertas={shell.modales.forjasAbiertas}
        paletaAbierta={shell.modales.paletaAbierta}
        confirmacion={mut.confirmacion}
        contextMenu={shell.contextMenu}
        onCerrarCommit={() => {
          git.setSelectedCommit(null);
          shell.setRamaInspeccionada(null);
        }}
        onCheckout={mut.handleCheckout}
        onInspeccionarArchivo={(path, opciones) => void shell.inspectarArchivo(path, opciones)}
        ramaInspeccionada={shell.ramaInspeccionada}
        onSaveStash={mut.handleSaveStash}
        onPopStash={mut.handlePopStash}
        onDropStash={mut.handleDropStash}
        onCerrarStash={() => shell.modales.setIsStashModalOpen(false)}
        onAddRemote={mut.handleAddRemote}
        onRemoveRemote={mut.handleRemoveRemote}
        onFetchAll={mut.handleFetch}
        onCerrarRemote={() => shell.modales.setIsRemoteModalOpen(false)}
        onMerge={mut.handleMerge}
        onCerrarCompare={() => shell.modales.setIsCompareModalOpen(false)}
        onCerrarNacimiento={() => shell.modales.setNacimientoAbierto(false)}
        onClonado={async (path) => {
          git.showToast('Repositorio clonado', 'success');
          shell.modales.setNacimientoAbierto(false);
          await git.loadRepos();
          git.setSelectedRepo(path);
        }}
        onInicializado={async (path) => {
          git.showToast('Repositorio inicializado', 'success');
          shell.modales.setNacimientoAbierto(false);
          await git.loadRepos();
          git.setSelectedRepo(path);
        }}
        onError={(m) => git.showToast(m, 'error')}
        onCerrarForjas={() => shell.modales.setForjasAbiertas(false)}
        onExito={(m) => git.showToast(m, 'success')}
        onCheckoutHecho={() => git.selectedRepo && void git.refreshRepoData(git.selectedRepo)}
        onCerrarContext={() => shell.setContextMenu(null)}
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
            git.showToast(err instanceof Error ? err.message : 'Error', 'error'),
          );
        }}
        onCerrarPaleta={() => shell.modales.setPaletaAbierta(false)}
        onPaleta={onPaleta}
      />

      {shell.modales.timelineAbierta && (
        <PanelTimeline
          entradas={mut.journal}
          loading={git.loading}
          onCerrar={() => shell.modales.setTimelineAbierta(false)}
          onDeshacer={(id) => void mut.handleDeshacer(id)}
        />
      )}

      {shell.modales.identidadAbierta && git.selectedRepo && (
        <ModalIdentidadGit
          repoPath={git.selectedRepo}
          onClose={() => shell.modales.setIdentidadAbierta(false)}
          onGuardado={() => git.showToast('Identidad git configurada', 'success')}
          onError={(m) => git.showToast(m, 'error')}
        />
      )}
    </div>
  );
};

function OverlayContextMenu({
  contextMenu,
  onCerrar,
}: {
  contextMenu: { commit: unknown; position: { x: number; y: number } } | null;
  onCerrar: () => void;
}) {
  if (!contextMenu) return null;
  return (
    <button
      type="button"
      className="fixed inset-0 z-30 cursor-default bg-transparent"
      aria-label="Cerrar menú contextual"
      onClick={onCerrar}
    />
  );
}

export default App;

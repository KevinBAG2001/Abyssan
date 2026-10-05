import React from 'react';
import { Header } from './components/Header';
import { GitConsoleDrawer } from './components/GitConsoleDrawer';
import { CapaModalesApp } from './components/CapaModalesApp';
import { AreaTrabajoGit } from './components/app/AreaTrabajoGit';
import { CapasEstadoApp } from './components/app/CapasEstadoApp';
import { construirInteligenciaGrafo } from './application/construirInteligenciaGrafo';
import { useGitRepository } from './application/hooks/useGitRepository';
import { useMutacionesGit } from './application/hooks/useMutacionesGit';
import { useEfectosAppShell } from './application/hooks/useEfectosAppShell';
import { useEstadoAppShell } from './application/hooks/useEstadoAppShell';
import { useSesionInstancia } from './application/hooks/useSesionInstancia';
import type { AccionPaleta } from './components/PaletaComandos';
import { ui } from './lib/diseno';
import { cn } from './lib/utils';
import { esCommitHead } from './lib/grafo-utils';
import type { BranchModel, CommitModel, GitOperacionModel, RepositoryStatusModel } from './domain/models/GitModels';

function ejecutarAccionPaleta(
  accion: AccionPaleta,
  acciones: {
    fetch: () => void;
    pull: () => void;
    push: () => void;
    enfocarCommit: () => void;
    abrirForjas: () => void;
  },
) {
  if (accion === 'fetch') acciones.fetch();
  if (accion === 'pull') acciones.pull();
  if (accion === 'push') acciones.push();
  if (accion === 'commit') acciones.enfocarCommit();
  if (accion === 'forjas') acciones.abrirForjas();
}

function derivarCabecera(
  status: RepositoryStatusModel | null,
  commits: CommitModel[],
  branches: BranchModel[],
  loading: boolean,
  mutando: boolean,
  operaciones: GitOperacionModel[],
) {
  const ramaActual = status?.currentBranch || 'HEAD';
  const headDesvinculado = ramaActual === 'HEAD desvinculado' || /^[0-9a-f]{7,40}$/i.test(ramaActual);
  const ocupado = loading || mutando || operaciones.some((op) => op.estado === 'en_cola' || op.estado === 'corriendo');
  const commitHead = commits.find((commit) => esCommitHead(commit));
  const headShort = commitHead?.shortHash || branches.find((rama) => rama.current)?.commit?.slice(0, 7) || undefined;
  return { ramaActual, headDesvinculado, ocupado, headShort };
}

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

  const cabecera = derivarCabecera(
    git.status,
    git.commits,
    git.branches,
    git.loading,
    mut.mutando,
    git.operaciones,
  );

  const onPaleta = (accion: AccionPaleta) => {
    ejecutarAccionPaleta(accion, {
      fetch: () => void mut.handleFetch(),
      pull: () => void mut.handlePull(shell.modoPull),
      push: () => void mut.handlePush(),
      enfocarCommit: () => document.getElementById('abyssan-commit-input')?.focus(),
      abrirForjas: () => shell.modales.setForjasAbiertas(true),
    });
  };

  const inteligenciaGrafo = React.useMemo(
    () =>
      construirInteligenciaGrafo({
        headDesvinculado: cabecera.headDesvinculado,
        status: git.status,
        branches: git.branches,
        operaciones: git.operaciones,
        ramaInspeccionada: shell.ramaInspeccionada,
        preview: mut.confirmacion?.preview,
        journal: mut.journal,
        ultimaOp: mut.ultimaOp,
      }),
    [
      cabecera.headDesvinculado,
      git.status,
      git.branches,
      git.operaciones,
      shell.ramaInspeccionada,
      mut.confirmacion,
      mut.journal,
      mut.ultimaOp,
    ],
  );

  return (
    <div className={cn(ui.app, 'h-screen w-screen')} aria-busy={cabecera.ocupado || sesion.cargando}>
      <OverlayContextMenu contextMenu={shell.contextMenu} onCerrar={() => shell.setContextMenu(null)} />

      <CapasEstadoApp
        toast={git.toast}
        requiereToken={sesion.requiereToken}
        sesionLista={sesion.lista}
        sesionCargando={sesion.cargando}
        sesionError={sesion.error}
        onAbrirSesion={sesion.abrir}
        explicacion={shell.explicacionActiva}
        onCerrarExplicacion={shell.descartarExplicacion}
        timelineAbierta={shell.modales.timelineAbierta}
        journal={mut.journal}
        loading={git.loading}
        onCerrarTimeline={() => shell.modales.setTimelineAbierta(false)}
        onDeshacer={(id) => void mut.handleDeshacer(id)}
        identidadAbierta={shell.modales.identidadAbierta}
        repoPath={git.selectedRepo}
        onCerrarIdentidad={() => shell.modales.setIdentidadAbierta(false)}
        onIdentidadGuardada={() => git.showToast('Identidad git configurada', 'success')}
        onError={(mensaje) => git.showToast(mensaje, 'error')}
      />

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
        loading={cabecera.ocupado}
        headDesvinculado={cabecera.headDesvinculado}
        ramaActual={cabecera.ramaActual}
        ramaInspeccionada={shell.ramaInspeccionada}
        nombresRemotos={git.remotes.map((r) => r.name)}
        inteligenciaGrafo={inteligenciaGrafo}
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
        currentBranch={git.selectedRepo ? cabecera.ramaActual : undefined}
        headShortHash={cabecera.headShort}
        loading={cabecera.ocupado}
      />

      <CapaModalesApp
        selectedRepo={git.selectedRepo}
        selectedCommit={git.selectedCommit}
        currentBranch={cabecera.ramaActual}
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

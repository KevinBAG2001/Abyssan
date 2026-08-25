import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommitGraph } from './components/CommitGraph';
import { StagingPanel } from './components/StagingPanel';
import { DiffViewer } from './components/DiffViewer';
import { CommitDetailsModal } from './components/CommitDetailsModal';
import { StashManagerModal } from './components/StashManagerModal';
import { RemoteManagerModal } from './components/RemoteManagerModal';
import { BranchCompareModal } from './components/BranchCompareModal';
import { ConflictResolver } from './components/ConflictResolver';
import { CommitContextMenu } from './components/CommitContextMenu';
import { GitConsoleDrawer } from './components/GitConsoleDrawer';
import { ModalConfirmacion } from './components/ModalConfirmacion';
import { ModalNacimientoRepo } from './components/ModalNacimientoRepo';
import { PaletaComandos, AccionPaleta } from './components/PaletaComandos';
import { ModalForjas } from './components/ModalForjas';
import { httpGitApi, UltimaOperacion, EntradaReflog } from './infrastructure/api/HttpGitApi';
import { useGitRepository } from './application/hooks/useGitRepository';
import { GitCommit, GitFileStatus } from './types/git';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const CLAVE_PULL = 'abyssan.modoPull';

export const App: React.FC = () => {
  const {
    repos,
    selectedRepo,
    setSelectedRepo,
    status,
    commits,
    branches,
    tags,
    stashes,
    remotes,
    logs,
    setLogs,
    selectedCommit,
    setSelectedCommit,
    selectedFile,
    setSelectedFile,
    currentDiff,
    setCurrentDiff,
    conflictData,
    setConflictData,
    loading,
    cargandoRepos,
    toast,
    showToast,
    refreshRepoData,
    loadRepos,
  } = useGitRepository();

  const [isStashModalOpen, setIsStashModalOpen] = useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [nacimientoAbierto, setNacimientoAbierto] = useState(false);
  const [forjasAbiertas, setForjasAbiertas] = useState(false);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [modoPull, setModoPull] = useState<'merge' | 'rebase'>(
    () => (localStorage.getItem(CLAVE_PULL) as 'merge' | 'rebase') || 'merge'
  );
  const [ultimaOp, setUltimaOp] = useState<UltimaOperacion>({ puedeDeshacer: false });
  const [reflog, setReflog] = useState<EntradaReflog[]>([]);
  const [confirmacion, setConfirmacion] = useState<{
    titulo: string;
    descripcion: string;
    peligro?: boolean;
    etiqueta?: string;
    ejecutar: () => Promise<void>;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    commit: GitCommit;
    position: { x: number; y: number };
  } | null>(null);

  const refrescarMeta = async (repoPath: string) => {
    try {
      const [op, rf] = await Promise.all([
        httpGitApi.getUltimaOperacion(repoPath),
        httpGitApi.getReflog(repoPath),
      ]);
      setUltimaOp(op);
      setReflog(rf);
    } catch {
      setUltimaOp({ puedeDeshacer: false, motivoBloqueo: 'No se pudo leer la última operación' });
    }
  };

  const afterMutacion = async () => {
    if (!selectedRepo) return;
    await refreshRepoData(selectedRepo);
    await refrescarMeta(selectedRepo);
  };

  useEffect(() => {
    if (selectedRepo) refrescarMeta(selectedRepo);
  }, [selectedRepo]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('oauth') === 'ok') showToast('Cuenta de forja conectada', 'success');
    if (q.get('oauth') === 'error') showToast('OAuth falló. Revisa CLIENT_ID/SECRET.', 'error');
    if (q.has('oauth')) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        void handleStageAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setPaletaAbierta(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSelectFile = async (file: GitFileStatus) => {
    if (!selectedRepo) return;
    setSelectedFile(file);
    setConflictData(null);
    try {
      const diff = await httpGitApi.getDiff(selectedRepo, file.path, file.staged);
      setCurrentDiff(diff);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error obteniendo diferencias', 'error');
    }
  };

  const handleOpenConflictResolver = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      const data = await httpGitApi.getConflict(selectedRepo, filePath);
      setConflictData(data);
      setSelectedFile(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleResolveConflict = async (resolvedContent: string) => {
    if (!selectedRepo || !conflictData) return;
    try {
      await httpGitApi.resolveConflict(selectedRepo, conflictData.filePath, resolvedContent);
      showToast(`Conflicto en ${conflictData.filePath} resuelto`, 'success');
      setConflictData(null);
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleStageFile = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.stage(selectedRepo, filePath);
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleStageAll = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.stage(selectedRepo, undefined, true);
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.unstage(selectedRepo, filePath);
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCommit = async (message: string, description?: string) => {
    if (!selectedRepo) return;
    try {
      const hash = await httpGitApi.commit(selectedRepo, message, description);
      showToast(`Commit creado (${hash.substring(0, 7)})`, 'success');
      setSelectedFile(null);
      setCurrentDiff('');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCheckout = async (target: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.checkout(selectedRepo, target);
      showToast(`Cambiado a ${target}`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCreateBranch = async (branchName: string, startPoint?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.createBranch(selectedRepo, branchName, startPoint);
      showToast(`Rama "${branchName}" creada`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCreateTag = async (tagName: string, targetHash?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.createTag(selectedRepo, tagName, targetHash);
      showToast(`Tag "${tagName}" creado`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handlePull = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.pull(selectedRepo, modoPull);
      showToast(`Pull (${modoPull}) completado`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.push(selectedRepo);
      showToast('Push completado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleFetch = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.fetchAll(selectedRepo, true);
      showToast('Fetch completado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleMerge = async (sourceBranch: string, noFf: boolean) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.merge(selectedRepo, sourceBranch, noFf);
      showToast(`Fusión con ${sourceBranch} completada`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleAddRemote = async (name: string, url: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.addRemote(selectedRepo, name, url);
      showToast(`Remoto "${name}" añadido`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleRemoveRemote = async (name: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.removeRemote(selectedRepo, name);
      showToast(`Remoto "${name}" eliminado`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleSaveStash = async (message?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.saveStash(selectedRepo, message);
      showToast('Stash guardado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handlePopStash = async (index: number) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.popStash(selectedRepo, index);
      showToast('Stash aplicado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleDropStash = async (index: number) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.dropStash(selectedRepo, index);
      showToast('Stash eliminado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCherryPick = async (hash: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.cherryPick(selectedRepo, hash);
      showToast(`Cherry-pick aplicado (${hash.substring(0, 7)})`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleRevert = async (hash: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.revert(selectedRepo, hash);
      showToast(`Commit revertido (${hash.substring(0, 7)})`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const ejecutarReset = async (type: 'soft' | 'mixed' | 'hard', hash: string) => {
    if (!selectedRepo) return;
    await httpGitApi.reset(selectedRepo, type, hash);
    showToast(`Reset (${type}) ejecutado`, 'success');
    await afterMutacion();
  };

  const handleReset = (type: 'soft' | 'mixed' | 'hard', hash: string) => {
    if (type === 'hard') {
      setConfirmacion({
        titulo: 'Reset hard',
        descripcion: `Se moverá HEAD a ${hash.substring(0, 7)} y se perderán los cambios no confirmados.`,
        etiqueta: 'Reset hard',
        peligro: true,
        ejecutar: () => ejecutarReset(type, hash),
      });
      return;
    }
    void ejecutarReset(type, hash).catch((err) => showToast(err.message, 'error'));
  };

  const handleDiscard = (filePath: string) => {
    setConfirmacion({
      titulo: 'Descartar archivo',
      descripcion: `Se perderán los cambios de «${filePath}» en el working tree. Esta acción no usa window.confirm.`,
      etiqueta: 'Descartar',
      peligro: true,
      ejecutar: async () => {
        if (!selectedRepo) return;
        await httpGitApi.discardArchivo(selectedRepo, filePath);
        showToast(`Descartado ${filePath}`, 'success');
        setSelectedFile(null);
        setCurrentDiff('');
        await afterMutacion();
      },
    });
  };

  const handleDeleteBranch = (branchName: string) => {
    setConfirmacion({
      titulo: 'Borrar rama local',
      descripcion: `Se eliminará la rama «${branchName}». No se puede borrar HEAD.`,
      etiqueta: 'Borrar rama',
      peligro: true,
      ejecutar: async () => {
        if (!selectedRepo) return;
        await httpGitApi.deleteLocalBranch(selectedRepo, branchName);
        showToast(`Rama ${branchName} eliminada`, 'success');
        await afterMutacion();
      },
    });
  };

  const handleRenameBranch = async (nombreActual: string, nombreNuevo: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.renameLocalBranch(selectedRepo, nombreActual, nombreNuevo);
      showToast(`Rama renombrada a ${nombreNuevo}`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleAbortMerge = () => {
    setConfirmacion({
      titulo: 'Abortar merge',
      descripcion: 'Se cancelará el merge en curso y el working tree volverá al estado previo.',
      etiqueta: 'Abortar merge',
      peligro: true,
      ejecutar: async () => {
        if (!selectedRepo) return;
        await httpGitApi.abortarMerge(selectedRepo);
        showToast('Merge abortado', 'success');
        setConflictData(null);
        await afterMutacion();
      },
    });
  };

  const handleContinuarMerge = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.continuarMerge(selectedRepo);
      showToast('Merge continuado', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleAmend = async (message: string) => {
    if (!selectedRepo) return;
    try {
      const info = await httpGitApi.getAmendInfo(selectedRepo);
      const ejecutar = async (confirmarRemoto: boolean) => {
        const hash = await httpGitApi.amend(selectedRepo, message, confirmarRemoto);
        showToast(`Commit enmendado (${hash.substring(0, 7)})`, 'success');
        await afterMutacion();
      };
      if (!info.esNuestro) {
        showToast('Solo puedes enmendar un commit propio', 'error');
        return;
      }
      if (info.estaEnRemoto) {
        setConfirmacion({
          titulo: 'Enmendar commit ya publicado',
          descripcion: 'El último commit ya está en el remoto. Enmendar reescribe historia.',
          etiqueta: 'Enmendar de todos modos',
          peligro: true,
          ejecutar: () => ejecutar(true),
        });
        return;
      }
      await ejecutar(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleDeshacer = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.deshacer(selectedRepo);
      showToast('Operación deshecha', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const onPaleta = (accion: AccionPaleta) => {
    if (accion === 'fetch') void handleFetch();
    if (accion === 'pull') void handlePull();
    if (accion === 'push') void handlePush();
    if (accion === 'commit') document.getElementById('abyssan-commit-input')?.focus();
    if (accion === 'forjas') setForjasAbiertas(true);
  };

  const cambiarModoPull = (modo: 'merge' | 'rebase') => {
    setModoPull(modo);
    localStorage.setItem(CLAVE_PULL, modo);
  };

  return (
    <div
      className="flex flex-col h-screen w-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans"
      onClick={() => setContextMenu(null)}
    >
      {toast && (
        <div
          className={`fixed bottom-12 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold border ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/95 text-rose-300 border-rose-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <Header
        repos={repos}
        selectedRepo={selectedRepo}
        status={status}
        loading={loading}
        cargandoRepos={cargandoRepos}
        onSelectRepo={setSelectedRepo}
        onPull={handlePull}
        onPush={handlePush}
        onRefresh={() => selectedRepo && refreshRepoData(selectedRepo)}
        onOpenStashModal={() => setIsStashModalOpen(true)}
        onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        onFetch={handleFetch}
        onOpenNacimiento={() => setNacimientoAbierto(true)}
        onOpenForjas={() => setForjasAbiertas(true)}
        onDeshacer={handleDeshacer}
        modoPull={modoPull}
        onCambiarModoPull={cambiarModoPull}
        puedeDeshacer={Boolean(ultimaOp.puedeDeshacer)}
        motivoDeshacer={ultimaOp.motivoBloqueo}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          branches={branches}
          tags={tags}
          currentBranch={status?.currentBranch || 'HEAD'}
          loading={loading}
          onCheckout={handleCheckout}
          onCreateBranch={(name) => handleCreateBranch(name)}
          onCreateTag={(name) => handleCreateTag(name)}
          onDeleteBranch={handleDeleteBranch}
          onRenameBranch={handleRenameBranch}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-[#0f111a] relative">
          {conflictData ? (
            <ConflictResolver
              conflictData={conflictData}
              loading={loading}
              isMerging={status?.isMerging}
              onResolve={handleResolveConflict}
              onCancel={() => setConflictData(null)}
              onAbortMerge={handleAbortMerge}
            />
          ) : selectedFile ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="h-8 bg-[#181c2d] border-b border-[#23283b] px-4 flex items-center justify-between text-xs">
                <span className="text-slate-400">Inspeccionando archivo modificado</span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setCurrentDiff('');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Volver al Grafo de Commits
                </button>
              </div>
              <DiffViewer diff={currentDiff} filePath={selectedFile.path} isStaged={selectedFile.staged} />
            </div>
          ) : (
            <CommitGraph
              commits={commits}
              selectedCommit={selectedCommit}
              onSelectCommit={setSelectedCommit}
              onContextMenu={(commit, position) => setContextMenu({ commit, position })}
            />
          )}
        </main>

        <StagingPanel
          status={status}
          selectedFile={selectedFile}
          loading={loading}
          onSelectFile={handleSelectFile}
          onStageFile={handleStageFile}
          onStageAll={handleStageAll}
          onUnstageFile={handleUnstageFile}
          onCommit={handleCommit}
          onOpenConflictResolver={handleOpenConflictResolver}
          onDiscardFile={handleDiscard}
          onAbortMerge={handleAbortMerge}
          onContinuarMerge={handleContinuarMerge}
          onAmend={handleAmend}
        />
      </div>

      <GitConsoleDrawer
        logs={logs}
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
        onClear={() => setLogs([])}
        reflog={reflog}
      />

      <CommitDetailsModal
        commit={selectedCommit}
        onClose={() => setSelectedCommit(null)}
        onCheckout={handleCheckout}
      />

      {isStashModalOpen && (
        <StashManagerModal
          stashes={stashes}
          loading={loading}
          onSaveStash={handleSaveStash}
          onPopStash={handlePopStash}
          onDropStash={handleDropStash}
          onClose={() => setIsStashModalOpen(false)}
        />
      )}

      {isRemoteModalOpen && (
        <RemoteManagerModal
          remotes={remotes}
          loading={loading}
          onAddRemote={handleAddRemote}
          onRemoveRemote={handleRemoveRemote}
          onFetchAll={handleFetch}
          onClose={() => setIsRemoteModalOpen(false)}
        />
      )}

      {isCompareModalOpen && selectedRepo && (
        <BranchCompareModal
          repoPath={selectedRepo}
          branches={branches}
          currentBranch={status?.currentBranch || 'HEAD'}
          loading={loading}
          onMerge={handleMerge}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}

      {nacimientoAbierto && (
        <ModalNacimientoRepo
          onClose={() => setNacimientoAbierto(false)}
          onClonado={async (path) => {
            showToast('Repositorio clonado', 'success');
            setNacimientoAbierto(false);
            await loadRepos();
            setSelectedRepo(path);
          }}
          onInicializado={async (path) => {
            showToast('Repositorio inicializado', 'success');
            setNacimientoAbierto(false);
            await loadRepos();
            setSelectedRepo(path);
          }}
          onError={(m) => showToast(m, 'error')}
        />
      )}

      {forjasAbiertas && selectedRepo && (
        <ModalForjas
          repoPath={selectedRepo}
          ramaActual={status?.currentBranch || 'HEAD'}
          ramas={branches}
          onClose={() => setForjasAbiertas(false)}
          onError={(m) => showToast(m, 'error')}
          onExito={(m) => showToast(m, 'success')}
          onCheckoutHecho={() => void refreshRepoData(selectedRepo)}
        />
      )}

      {contextMenu && (
        <CommitContextMenu
          commit={contextMenu.commit}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onCreateBranch={(startPoint) => {
            const name = prompt('Nombre de la nueva rama:');
            if (name?.trim()) handleCreateBranch(name.trim(), startPoint);
          }}
          onCreateTag={(hash) => {
            const name = prompt('Nombre del nuevo tag:');
            if (name?.trim()) handleCreateTag(name.trim(), hash);
          }}
          onCherryPick={handleCherryPick}
          onRevert={handleRevert}
          onReset={handleReset}
        />
      )}

      {confirmacion && (
        <ModalConfirmacion
          titulo={confirmacion.titulo}
          descripcion={confirmacion.descripcion}
          etiquetaConfirmar={confirmacion.etiqueta}
          peligro={confirmacion.peligro}
          onCancelar={() => setConfirmacion(null)}
          onConfirmar={() => {
            const ejec = confirmacion.ejecutar;
            setConfirmacion(null);
            void ejec().catch((err: unknown) =>
              showToast(err instanceof Error ? err.message : 'Error', 'error')
            );
          }}
        />
      )}

      <PaletaComandos abierta={paletaAbierta} onCerrar={() => setPaletaAbierta(false)} onAccion={onPaleta} />
    </div>
  );
};
export default App;

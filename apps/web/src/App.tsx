import React, { useState } from 'react';
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
import { httpGitApi } from './infrastructure/api/HttpGitApi';
import { useGitRepository } from './application/hooks/useGitRepository';
import { GitCommit, GitFileStatus } from './types/git';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
    toast,
    showToast,
    refreshRepoData,
  } = useGitRepository();

  // Modales y Drawers
  const [isStashModalOpen, setIsStashModalOpen] = useState<boolean>(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    commit: GitCommit;
    position: { x: number; y: number };
  } | null>(null);

  // Seleccion de archivo para Diff
  const handleSelectFile = async (file: GitFileStatus) => {
    if (!selectedRepo) return;
    setSelectedFile(file);
    setConflictData(null);
    try {
      const diff = await httpGitApi.getDiff(selectedRepo, file.path, file.staged);
      setCurrentDiff(diff);
    } catch (err: any) {
      showToast(err.message || 'Error obteniendo diferencias', 'error');
    }
  };

  // Conflictos
  const handleOpenConflictResolver = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      const data = await httpGitApi.getConflict(selectedRepo, filePath);
      setConflictData(data);
      setSelectedFile(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResolveConflict = async (resolvedContent: string) => {
    if (!selectedRepo || !conflictData) return;
    try {
      await httpGitApi.resolveConflict(selectedRepo, conflictData.filePath, resolvedContent);
      showToast(`Conflicto en ${conflictData.filePath} resuelto con éxito`, 'success');
      setConflictData(null);
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Staging
  const handleStageFile = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.stage(selectedRepo, filePath);
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStageAll = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.stage(selectedRepo, undefined, true);
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.unstage(selectedRepo, filePath);
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Commit
  const handleCommit = async (message: string, description?: string) => {
    if (!selectedRepo) return;
    try {
      const hash = await httpGitApi.commit(selectedRepo, message, description);
      showToast(`Commit creado (${hash.substring(0, 7)})`, 'success');
      setSelectedFile(null);
      setCurrentDiff('');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Checkout, Branch, Tag
  const handleCheckout = async (target: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.checkout(selectedRepo, target);
      showToast(`Cambiado a ${target}`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateBranch = async (branchName: string, startPoint?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.createBranch(selectedRepo, branchName, startPoint);
      showToast(`Rama "${branchName}" creada`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateTag = async (tagName: string, targetHash?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.createTag(selectedRepo, tagName, targetHash);
      showToast(`Tag "${tagName}" creado`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Push / Pull / Merge
  const handlePull = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.pull(selectedRepo);
      showToast('Pull completado con éxito', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.push(selectedRepo);
      showToast('Push completado con éxito', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleMerge = async (sourceBranch: string, noFf: boolean) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.merge(selectedRepo, sourceBranch, noFf);
      showToast(`Fusión con ${sourceBranch} completada`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Remotos
  const handleAddRemote = async (name: string, url: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.addRemote(selectedRepo, name, url);
      showToast(`Remoto "${name}" añadido`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveRemote = async (name: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.removeRemote(selectedRepo, name);
      showToast(`Remoto "${name}" eliminado`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleFetchAll = async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.fetchAll(selectedRepo, true);
      showToast('Fetch y prune completados', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Stashes
  const handleSaveStash = async (message?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.saveStash(selectedRepo, message);
      showToast('Stash guardado', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePopStash = async (index: number) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.popStash(selectedRepo, index);
      showToast('Stash aplicado', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDropStash = async (index: number) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.dropStash(selectedRepo, index);
      showToast('Stash eliminado', 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Cherry-Pick, Revert, Reset
  const handleCherryPick = async (hash: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.cherryPick(selectedRepo, hash);
      showToast(`Cherry-pick aplicado (${hash.substring(0, 7)})`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRevert = async (hash: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.revert(selectedRepo, hash);
      showToast(`Commit revertido (${hash.substring(0, 7)})`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReset = async (type: 'soft' | 'hard', hash: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.reset(selectedRepo, type, hash);
      showToast(`Reset (${type}) ejecutado`, 'success');
      await refreshRepoData(selectedRepo);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div
      className="flex flex-col h-screen w-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans"
      onClick={() => setContextMenu(null)}
    >
      {/* Toast Notification */}
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

      {/* Barra Superior */}
      <Header
        repos={repos}
        selectedRepo={selectedRepo}
        status={status}
        loading={loading}
        onSelectRepo={setSelectedRepo}
        onPull={handlePull}
        onPush={handlePush}
        onRefresh={() => selectedRepo && refreshRepoData(selectedRepo)}
        onOpenStashModal={() => setIsStashModalOpen(true)}
        onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
      />

      {/* Espacio Principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de Ramas y Tags */}
        <Sidebar
          branches={branches}
          tags={tags}
          currentBranch={status?.currentBranch || 'HEAD'}
          loading={loading}
          onCheckout={handleCheckout}
          onCreateBranch={(name) => handleCreateBranch(name)}
          onCreateTag={(name) => handleCreateTag(name)}
        />

        {/* Zona Central */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0f111a] relative">
          {conflictData ? (
            <ConflictResolver
              conflictData={conflictData}
              loading={loading}
              onResolve={handleResolveConflict}
              onCancel={() => setConflictData(null)}
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

        {/* Panel Lateral de Staging */}
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
        />
      </div>

      {/* Consola de Comandos Git Plegable */}
      <GitConsoleDrawer
        logs={logs}
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
        onClear={() => setLogs([])}
      />

      {/* Modal de Detalles del Commit */}
      <CommitDetailsModal
        commit={selectedCommit}
        onClose={() => setSelectedCommit(null)}
        onCheckout={handleCheckout}
      />

      {/* Modal Gestor de Stash */}
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

      {/* Modal Gestor de Remotos */}
      {isRemoteModalOpen && (
        <RemoteManagerModal
          remotes={remotes}
          loading={loading}
          onAddRemote={handleAddRemote}
          onRemoveRemote={handleRemoveRemote}
          onFetchAll={handleFetchAll}
          onClose={() => setIsRemoteModalOpen(false)}
        />
      )}

      {/* Modal Comparador de Ramas */}
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

      {/* Menú Contextual de Commits */}
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
    </div>
  );
};
export default App;

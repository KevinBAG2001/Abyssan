import { useCallback, useEffect, useRef, useState } from 'react';
import { httpGitApi, type EntradaReflog, type UltimaOperacion } from '../../infrastructure/api/HttpGitApi';
import type { ConflictModel, EntradaJournal, FileStatusModel, RepositoryStatusModel } from '../../domain/models/GitModels';

export type ConfirmacionPendiente = {
  titulo: string;
  descripcion: string;
  peligro?: boolean;
  etiqueta?: string;
  nombreRequerido?: string;
  ejecutar: () => Promise<void>;
};

type DepsMutaciones = {
  selectedRepo: string | null;
  status: RepositoryStatusModel | null;
  conflictData: ConflictModel | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  refreshRepoData: (repoPath: string) => Promise<void>;
  setSelectedFile: (file: FileStatusModel | null) => void;
  setCurrentDiff: (diff: string) => void;
  setConflictData: (data: ConflictModel | null) => void;
};

export function useMutacionesGit({
  selectedRepo,
  status,
  conflictData,
  showToast,
  refreshRepoData,
  setSelectedFile,
  setCurrentDiff,
  setConflictData,
}: DepsMutaciones) {
  const [ultimaOp, setUltimaOp] = useState<UltimaOperacion>({ puedeDeshacer: false });
  const [journal, setJournal] = useState<EntradaJournal[]>([]);
  const [reflog, setReflog] = useState<EntradaReflog[]>([]);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionPendiente | null>(null);
  const [mutando, setMutando] = useState(false);
  const checkoutEnCurso = useRef(false);

  const refrescarMeta = useCallback(async (repoPath: string) => {
    try {
      const [op, rf, jn] = await Promise.all([
        httpGitApi.getUltimaOperacion(repoPath),
        httpGitApi.getReflog(repoPath),
        httpGitApi.getJournal(repoPath),
      ]);
      setUltimaOp(op);
      setReflog(rf);
      setJournal(jn);
    } catch {
      setUltimaOp({ puedeDeshacer: false, motivoBloqueo: 'No se pudo leer la última operación' });
      setJournal([]);
    }
  }, []);

  const afterMutacion = useCallback(async () => {
    if (!selectedRepo) return;
    await refreshRepoData(selectedRepo);
    await refrescarMeta(selectedRepo);
  }, [selectedRepo, refreshRepoData, refrescarMeta]);

  useEffect(() => {
    if (!selectedRepo) return;
    let vivo = true;
    void (async () => {
      try {
        const [op, rf, jn] = await Promise.all([
          httpGitApi.getUltimaOperacion(selectedRepo),
          httpGitApi.getReflog(selectedRepo),
          httpGitApi.getJournal(selectedRepo),
        ]);
        if (vivo) {
          setUltimaOp(op);
          setReflog(rf);
          setJournal(jn);
        }
      } catch {
        if (vivo) {
          setUltimaOp({ puedeDeshacer: false, motivoBloqueo: 'No se pudo leer la última operación' });
          setJournal([]);
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [selectedRepo]);

  const handleSelectFile = async (file: FileStatusModel) => {
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

  const handleStageAll = useCallback(async () => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.stage(selectedRepo, undefined, true);
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  }, [selectedRepo, afterMutacion, showToast]);

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
    if (!selectedRepo || checkoutEnCurso.current) return;
    checkoutEnCurso.current = true;
    setMutando(true);
    try {
      await httpGitApi.checkout(selectedRepo, target);
      showToast(`Cambiado a ${target}`, 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      checkoutEnCurso.current = false;
      setMutando(false);
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

  const handlePull = async (modoPull: 'merge' | 'rebase') => {
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
      const sucios = status?.files.length ?? 0;
      const sucio = sucios > 0;
      setConfirmacion({
        titulo: 'Reset hard',
        descripcion: sucio
          ? `Se moverá HEAD a ${hash.substring(0, 7)} y se perderán ${sucios} cambio${sucios === 1 ? '' : 's'} no confirmado${sucios === 1 ? '' : 's'} del working tree y del índice.`
          : `Se moverá HEAD a ${hash.substring(0, 7)}. El working tree está limpio.`,
        etiqueta: 'Reset hard',
        peligro: true,
        nombreRequerido: sucio ? 'RESET' : undefined,
        ejecutar: () => ejecutarReset(type, hash),
      });
      return;
    }
    void ejecutarReset(type, hash).catch((err) => showToast(err.message, 'error'));
  };

  const handleDiscard = (filePath: string) => {
    const sucios = status?.files.length ?? 1;
    setConfirmacion({
      titulo: 'Descartar archivo',
      descripcion: `Se perderán los cambios de «${filePath}» en el working tree (1 archivo). Hay ${sucios} cambio${sucios === 1 ? '' : 's'} no confirmado${sucios === 1 ? '' : 's'} en el repo.`,
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
      descripcion: `Se eliminará la rama «${branchName}». No se puede borrar HEAD. Si no está mergeada, el trabajo de esa rama queda solo en reflog.`,
      etiqueta: 'Borrar rama',
      peligro: true,
      nombreRequerido: branchName,
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

  const handleDeshacer = async (id?: string) => {
    if (!selectedRepo) return;
    try {
      await httpGitApi.deshacer(selectedRepo, id);
      showToast('Operación deshecha', 'success');
      await afterMutacion();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  return {
    ultimaOp,
    journal,
    reflog,
    confirmacion,
    mutando,
    setConfirmacion,
    handleSelectFile,
    handleOpenConflictResolver,
    handleResolveConflict,
    handleStageFile,
    handleStageAll,
    handleUnstageFile,
    handleCommit,
    handleCheckout,
    handleCreateBranch,
    handleCreateTag,
    handlePull,
    handlePush,
    handleFetch,
    handleMerge,
    handleAddRemote,
    handleRemoveRemote,
    handleSaveStash,
    handlePopStash,
    handleDropStash,
    handleCherryPick,
    handleRevert,
    handleReset,
    handleDiscard,
    handleDeleteBranch,
    handleRenameBranch,
    handleAbortMerge,
    handleContinuarMerge,
    handleAmend,
    handleDeshacer,
  };
}

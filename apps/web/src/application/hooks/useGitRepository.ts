// Austria: Hook de la Capa de Aplicacion para orquestar el estado de dominio del repositorio Git (DDD)
import { useState, useCallback, useEffect, useRef } from 'react';
import { httpGitApi } from '../../infrastructure/api/HttpGitApi.js';
import { wsClient } from '../../services/websocket.js';
import {
  RepositorySummaryModel,
  RepositoryStatusModel,
  CommitModel,
  BranchModel,
  TagModel,
  StashModel,
  RemoteModel,
  CommandLogModel,
  FileStatusModel,
  ConflictModel,
} from '../../domain/models/GitModels.js';

function dePromesa<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

export function useGitRepository() {
  const [repos, setRepos] = useState<RepositorySummaryModel[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [status, setStatus] = useState<RepositoryStatusModel | null>(null);
  const [commits, setCommits] = useState<CommitModel[]>([]);
  const [branches, setBranches] = useState<BranchModel[]>([]);
  const [tags, setTags] = useState<TagModel[]>([]);
  const [stashes, setStashes] = useState<StashModel[]>([]);
  const [remotes, setRemotes] = useState<RemoteModel[]>([]);
  const [logs, setLogs] = useState<CommandLogModel[]>([]);

  const [selectedCommit, setSelectedCommit] = useState<CommitModel | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileStatusModel | null>(null);
  const [currentDiff, setCurrentDiff] = useState<string>('');
  const [conflictData, setConflictData] = useState<ConflictModel | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [cargandoRepos, setCargandoRepos] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const generacion = useRef(0);
  const archivoSeleccionado = useRef<FileStatusModel | null>(null);
  archivoSeleccionado.current = selectedFile;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRepos = useCallback(async () => {
    setCargandoRepos(true);
    try {
      const data = await httpGitApi.getRepos();
      setRepos(data);
      setSelectedRepo((actual) => {
        if (actual) return actual;
        const firstGit = data.find((r) => r.isGitRepo) || data[0];
        return firstGit?.path ?? null;
      });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error cargando repositorios', 'error');
    } finally {
      setCargandoRepos(false);
    }
  }, []);

  const refreshLogs = async () => {
    try {
      const data = await httpGitApi.getLogs();
      setLogs(data);
    } catch {
      // Silencioso
    }
  };

  const refreshRepoData = useCallback(async (repoPath: string) => {
    if (!repoPath) return;
    const yo = ++generacion.current;
    setLoading(true);
    try {
      const rapidos = await Promise.allSettled([
        httpGitApi.getCommits(repoPath),
        httpGitApi.getBranches(repoPath),
        httpGitApi.getRemotes(repoPath),
      ]);
      if (yo !== generacion.current) return;
      setCommits(dePromesa(rapidos[0], []));
      setBranches(dePromesa(rapidos[1], []));
      setRemotes(dePromesa(rapidos[2], []));
      setLoading(false);

      const lentos = await Promise.allSettled([
        httpGitApi.getStatus(repoPath),
        httpGitApi.getTags(repoPath),
        httpGitApi.getStashes(repoPath),
      ]);
      if (yo !== generacion.current) return;

      const fallos = [...rapidos, ...lentos]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (fallos.length) {
        showToast(fallos[0], 'error');
      }

      setStatus(dePromesa(lentos[0], null));
      setTags(dePromesa(lentos[1], []));
      setStashes(dePromesa(lentos[2], []));
      await refreshLogs();

      const archivo = archivoSeleccionado.current;
      if (archivo) {
        try {
          const diff = await httpGitApi.getDiff(repoPath, archivo.path, archivo.staged);
          if (yo !== generacion.current) return;
          setCurrentDiff(diff);
        } catch {
          setSelectedFile(null);
          setCurrentDiff('');
        }
      }
    } finally {
      if (yo === generacion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepos();
    wsClient.connect();
  }, [loadRepos]);

  useEffect(() => {
    const unsubscribe = wsClient.onRepoChange((data) => {
      if (selectedRepo && data.repoPath.toLowerCase() === selectedRepo.toLowerCase()) {
        void refreshRepoData(selectedRepo);
      }
    });
    return () => unsubscribe();
  }, [selectedRepo, refreshRepoData]);

  useEffect(() => {
    if (!selectedRepo) return;
    wsClient.watchRepo(selectedRepo);
    setSelectedFile(null);
    setSelectedCommit(null);
    setConflictData(null);
    setCurrentDiff('');
    void refreshRepoData(selectedRepo);
  }, [selectedRepo, refreshRepoData]);

  return {
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
  };
}

// Austria: Hook de la Capa de Aplicacion para orquestar el estado de dominio del repositorio Git (DDD)
import { useState, useCallback, useEffect } from 'react';
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRepos = async () => {
    try {
      const data = await httpGitApi.getRepos();
      setRepos(data);
      if (data.length > 0 && !selectedRepo) {
        const firstGit = data.find((r) => r.isGitRepo) || data[0];
        setSelectedRepo(firstGit.path);
      }
    } catch (err: any) {
      console.error('[WebKraken] Error cargando repositorios:', err);
    }
  };

  const refreshLogs = async () => {
    try {
      const data = await httpGitApi.getLogs();
      setLogs(data);
    } catch {
      // Silencioso
    }
  };

  const refreshRepoData = useCallback(
    async (repoPath: string) => {
      if (!repoPath) return;
      setLoading(true);
      try {
        const [repoStatus, repoCommits, repoBranches, repoTags, repoStashes, repoRemotes] = await Promise.all([
          httpGitApi.getStatus(repoPath),
          httpGitApi.getCommits(repoPath),
          httpGitApi.getBranches(repoPath),
          httpGitApi.getTags(repoPath),
          httpGitApi.getStashes(repoPath),
          httpGitApi.getRemotes(repoPath),
        ]);
        setStatus(repoStatus);
        setCommits(repoCommits);
        setBranches(repoBranches);
        setTags(repoTags);
        setStashes(repoStashes);
        setRemotes(repoRemotes);
        await refreshLogs();

        if (selectedFile) {
          try {
            const diff = await httpGitApi.getDiff(repoPath, selectedFile.path, selectedFile.staged);
            setCurrentDiff(diff);
          } catch {
            setSelectedFile(null);
            setCurrentDiff('');
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Error al cargar datos del repositorio', 'error');
      } finally {
        setLoading(false);
      }
    },
    [selectedFile]
  );

  useEffect(() => {
    loadRepos();
    wsClient.connect();

    const unsubscribe = wsClient.onRepoChange((data) => {
      if (selectedRepo && data.repoPath.toLowerCase() === selectedRepo.toLowerCase()) {
        refreshRepoData(selectedRepo);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedRepo, refreshRepoData]);

  useEffect(() => {
    if (selectedRepo) {
      wsClient.watchRepo(selectedRepo);
      setSelectedFile(null);
      setSelectedCommit(null);
      setConflictData(null);
      setCurrentDiff('');
      refreshRepoData(selectedRepo);
    }
  }, [selectedRepo]);

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
    toast,
    showToast,
    refreshRepoData,
  };
}

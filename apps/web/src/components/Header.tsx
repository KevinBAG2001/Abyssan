import React from 'react';
import {
  GitBranch,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
  Archive,
  Terminal,
  Globe,
  GitCompare,
  Download,
  Undo2,
  FolderPlus,
  GitPullRequest,
} from 'lucide-react';
import { GitRepoSummary, GitRepoStatus } from '../types/git';

interface HeaderProps {
  repos: GitRepoSummary[];
  selectedRepo: string | null;
  status: GitRepoStatus | null;
  loading: boolean;
  cargandoRepos?: boolean;
  onSelectRepo: (repoPath: string) => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  onOpenStashModal: () => void;
  onOpenRemoteModal: () => void;
  onOpenCompareModal: () => void;
  onToggleConsole: () => void;
  onFetch: () => void;
  onOpenNacimiento: () => void;
  onOpenForjas: () => void;
  onDeshacer: () => void;
  modoPull: 'merge' | 'rebase';
  onCambiarModoPull: (modo: 'merge' | 'rebase') => void;
  puedeDeshacer: boolean;
  motivoDeshacer?: string;
}

export const Header: React.FC<HeaderProps> = ({
  repos,
  selectedRepo,
  status,
  loading,
  cargandoRepos = false,
  onSelectRepo,
  onPull,
  onPush,
  onRefresh,
  onOpenStashModal,
  onOpenRemoteModal,
  onOpenCompareModal,
  onToggleConsole,
  onFetch,
  onOpenNacimiento,
  onOpenForjas,
  onDeshacer,
  modoPull,
  onCambiarModoPull,
  puedeDeshacer,
  motivoDeshacer,
}) => {
  return (
    <header className="h-14 bg-[#141724] border-b border-[#23283b] px-4 flex items-center justify-between select-none">
      {/* Logo y Selector de Repositorio */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FolderGit2 className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Abyssan
          </span>
        </div>

        <div className="h-5 w-[1px] bg-[#23283b] mx-2" />

        {/* Selector de Repositorios */}
        <div className="relative">
          <select
            value={selectedRepo || ''}
            onChange={(e) => onSelectRepo(e.target.value)}
            className="bg-[#1b1f30] hover:bg-[#23283b] text-slate-200 text-sm font-medium rounded-md px-3 py-1.5 border border-[#2e354e] focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="" disabled>
              {cargandoRepos
                ? 'Cargando repositorios…'
                : repos.length === 0
                  ? 'Sin repos en PROJECTS_ROOT'
                  : '-- Seleccionar Repositorio --'}
            </option>
            {repos.map((repo) => (
              <option key={repo.path} value={repo.path}>
                {repo.name} (
                {selectedRepo === repo.path
                  ? status?.currentBranch || repo.currentBranch || 'git'
                  : repo.currentBranch || 'git'}
                )
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onOpenNacimiento}
          className="p-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 rounded-md border border-[#2e354e]"
          title="Clonar o inicializar repositorio"
        >
          <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>

      {/* Acciones de Git */}
      {selectedRepo && (
        <div className="flex items-center space-x-2">
          {/* Rama Actual */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs font-semibold">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{status?.currentBranch || 'HEAD'}</span>
          </div>

          {/* Ahead / Behind */}
          {status && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 px-2 py-1 bg-[#1b1f30] rounded-md border border-[#23283b]">
              <span className="flex items-center text-sky-400" title="Commits por detras del remoto (Pull)">
                <ArrowDown className="w-3.5 h-3.5 mr-0.5" />
                {status.behind}
              </span>
              <span className="flex items-center text-emerald-400" title="Commits por delante del remoto (Push)">
                <ArrowUp className="w-3.5 h-3.5 mr-0.5" />
                {status.ahead}
              </span>
            </div>
          )}

          <div className="h-5 w-[1px] bg-[#23283b] mx-1" />

          <button
            onClick={onFetch}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-200 text-xs font-medium rounded-md border border-[#2e354e] disabled:opacity-50"
            title="Fetch --all --prune"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Fetch</span>
          </button>

          <div className="flex items-center">
            <button
              onClick={onPull}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-200 text-xs font-medium rounded-l-md border border-[#2e354e] disabled:opacity-50"
              title={`Pull (${modoPull})`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Pull</span>
            </button>
            <select
              value={modoPull}
              onChange={(e) => onCambiarModoPull(e.target.value as 'merge' | 'rebase')}
              className="h-[30px] bg-[#1b1f30] border border-l-0 border-[#2e354e] rounded-r-md text-[10px] text-slate-400 px-1 focus:outline-none"
              title="Modo de pull (D10)"
            >
              <option value="merge">merge</option>
              <option value="rebase">rebase</option>
            </select>
          </div>

          {/* Push */}
          <button
            onClick={onPush}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] active:bg-[#2e354e] text-slate-200 text-xs font-medium rounded-md border border-[#2e354e] transition-colors disabled:opacity-50"
            title="Enviar cambios al remoto"
          >
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Push</span>
          </button>

          {/* Comparar Ramas */}
          <button
            onClick={onOpenCompareModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-purple-300 hover:text-purple-200 rounded-md border border-[#2e354e] text-xs transition-colors"
            title="Comparar Ramas & Merge"
          >
            <GitCompare className="w-3.5 h-3.5 text-purple-400" />
            <span>Comparar</span>
          </button>

          {/* Forjas */}
          <button
            onClick={onOpenForjas}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-sky-300 hover:text-sky-200 rounded-md border border-[#2e354e] text-xs transition-colors"
            title="PRs y MRs del origin"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />
            <span>PRs</span>
          </button>

          {/* Remotos */}
          <button
            onClick={onOpenRemoteModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-sky-300 hover:text-sky-200 rounded-md border border-[#2e354e] text-xs transition-colors"
            title="Gestor de Remotos"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Remotos</span>
          </button>

          {/* Stash */}
          <button
            onClick={onOpenStashModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 hover:text-white rounded-md border border-[#2e354e] text-xs transition-colors"
            title="Gestor de Stash"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Stash</span>
          </button>

          <button
            onClick={onDeshacer}
            disabled={loading || !puedeDeshacer}
            className="p-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 rounded-md border border-[#2e354e] disabled:opacity-40"
            title={puedeDeshacer ? 'Deshacer última operación' : motivoDeshacer || 'Nada que deshacer'}
          >
            <Undo2 className="w-3.5 h-3.5 text-purple-400" />
          </button>

          {/* Consola */}
          <button
            onClick={onToggleConsole}
            className="p-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 hover:text-white rounded-md border border-[#2e354e] transition-colors"
            title="Consola de Comandos Git"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Refrescar */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 hover:text-white rounded-md border border-[#2e354e] transition-colors disabled:opacity-50"
            title="Recargar repositorio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      )}

      {/* Indicador de Modo Seguro */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline font-medium">Modo Seguro</span>
      </div>
    </header>
  );
};

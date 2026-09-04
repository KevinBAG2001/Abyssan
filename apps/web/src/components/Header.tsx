import React from 'react';
import {
  GitBranch,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Archive,
  Terminal,
  Globe,
  GitCompare,
  Download,
  Undo2,
  FolderPlus,
  GitPullRequest,
  User,
  History,
  ChevronDown,
} from 'lucide-react';
import { GitRepoSummary, GitRepoStatus } from '../types/git';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { AbyssanLogo } from './AbyssanLogo';

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
  onOpenTimeline: () => void;
  onOpenIdentidad: () => void;
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
  onOpenTimeline,
  onOpenIdentidad,
  modoPull,
  onCambiarModoPull,
  puedeDeshacer,
  motivoDeshacer,
}) => {
  const nombreRepo = selectedRepo
    ? repos.find((r) => r.path === selectedRepo)?.name || selectedRepo.split(/[/\\]/).pop()
    : null;

  return (
    <header className={cn(ui.chrome, 'h-14 shrink-0 px-4 flex items-center justify-between gap-3 select-none min-w-0')}>
      <div className="flex items-center gap-3 min-w-0 shrink">
        <div className="flex items-center gap-2 shrink-0">
          <AbyssanLogo tamano="md" className="sm:h-8" />
          <span className="text-headline-sm text-on-surface hidden sm:inline tracking-tight font-sans">ABYSSAN</span>
        </div>

        <div className="h-5 w-px bg-outline-variant shrink-0 hidden sm:block" />

        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="selector-repo" className="sr-only">
            Repositorio
          </label>
          <div className="flex items-center gap-1 min-w-0">
            <GitBranch className="w-4 h-4 text-secondary shrink-0 hidden sm:block" />
            <select
              id="selector-repo"
              value={selectedRepo || ''}
              onChange={(e) => onSelectRepo(e.target.value)}
              className="max-w-[10rem] sm:max-w-[14rem] truncate bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-mono rounded border border-outline-variant px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="" disabled>
                {cargandoRepos
                  ? 'Cargando repositorios…'
                  : repos.length === 0
                    ? 'Sin repos en PROJECTS_ROOT'
                    : 'Seleccionar repositorio'}
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
            <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant -ml-6 pointer-events-none hidden sm:block" />
          </div>
          <button
            type="button"
            onClick={onOpenNacimiento}
            className={ui.btnIcono}
            title="Clonar o inicializar repositorio"
            aria-label="Clonar o inicializar repositorio"
          >
            <FolderPlus className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>

        {nombreRepo && (
          <nav aria-label="Ubicación en el repositorio" className="hidden lg:flex items-center gap-1 min-w-0 text-code-sm text-on-surface-variant truncate">
            <span className="truncate max-w-[6rem]">{nombreRepo}</span>
            {status?.currentBranch && (
              <>
                <span className="text-on-surface-variant/50">/</span>
                <span className="text-primary font-mono truncate max-w-[10rem]">{status.currentBranch}</span>
              </>
            )}
          </nav>
        )}
      </div>

      {selectedRepo && (
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full shrink-0 scrollbar-none">
          {status && (
            <div className="flex items-center gap-2 text-label-md text-on-surface-variant px-2 py-1 bg-surface-container rounded border border-outline-variant shrink-0">
              <span className="flex items-center text-secondary" title="Commits por detrás del remoto">
                <ArrowDown className="w-3.5 h-3.5 mr-0.5" />
                {status.behind}
              </span>
              <span className="text-outline-variant">|</span>
              <span className="flex items-center text-primary" title="Commits por delante del remoto">
                <ArrowUp className="w-3.5 h-3.5 mr-0.5" />
                {status.ahead}
              </span>
            </div>
          )}

          <button
            onClick={onFetch}
            disabled={loading}
            className={cn(ui.btnSecundario, 'shrink-0')}
            title="Fetch --all --prune"
          >
            <Download className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden xl:inline">Fetch</span>
          </button>

          <div className="flex items-center shrink-0">
            <button
              onClick={onPull}
              disabled={loading}
              className={cn(ui.btnSecundario, 'rounded-r-none border-r-0')}
              title={`Pull (${modoPull})`}
            >
              <ArrowDown className="w-3.5 h-3.5 text-secondary" />
              <span className="hidden xl:inline">Pull</span>
            </button>
            <select
              value={modoPull}
              onChange={(e) => onCambiarModoPull(e.target.value as 'merge' | 'rebase')}
              className="h-[30px] bg-surface-container-high border border-outline-variant rounded-r text-[10px] text-on-surface-variant px-1 focus:outline-none focus:border-primary"
              title="Modo de pull"
            >
              <option value="merge">merge</option>
              <option value="rebase">rebase</option>
            </select>
          </div>

          <button
            onClick={onPush}
            disabled={loading}
            className={cn(ui.btnPrimario, 'shrink-0')}
            title="Enviar cambios al remoto"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Push</span>
          </button>

          <div className="h-5 w-px bg-outline-variant shrink-0 hidden md:block" />

          <button onClick={onOpenCompareModal} className={cn(ui.btnSecundario, 'shrink-0 hidden md:inline-flex')} title="Comparar ramas y merge">
            <GitCompare className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
            <span className="hidden 2xl:inline">Comparar</span>
          </button>

          <button onClick={onOpenForjas} className={cn(ui.btnSecundario, 'shrink-0 hidden md:inline-flex')} title="PRs y MRs">
            <GitPullRequest className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden 2xl:inline">PRs</span>
          </button>

          <button onClick={onOpenRemoteModal} className={cn(ui.btnSecundario, 'shrink-0 hidden lg:inline-flex')} title="Gestor de remotos">
            <Globe className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden 2xl:inline">Remotos</span>
          </button>

          <button onClick={onOpenStashModal} className={cn(ui.btnSecundario, 'shrink-0 hidden lg:inline-flex')} title="Gestor de stash">
            <Archive className="w-3.5 h-3.5 text-ember" />
            <span className="hidden 2xl:inline">Stash</span>
          </button>

          <button onClick={onOpenIdentidad} className={ui.btnIcono} title="Identidad git">
            <User className="w-3.5 h-3.5 text-primary" />
          </button>

          <button onClick={onOpenTimeline} className={ui.btnIcono} title="Timeline de operaciones">
            <History className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
          </button>

          <button
            onClick={onDeshacer}
            disabled={loading || !puedeDeshacer}
            className={ui.btnIcono}
            title={puedeDeshacer ? 'Deshacer última operación' : motivoDeshacer || 'Nada que deshacer'}
          >
            <Undo2 className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
          </button>

          <button onClick={onToggleConsole} className={ui.btnIcono} title="Consola de comandos git">
            <Terminal className="w-3.5 h-3.5 text-primary" />
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className={ui.btnIcono}
            title="Recargar repositorio"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-primary')} />
          </button>
        </div>
      )}
    </header>
  );
};

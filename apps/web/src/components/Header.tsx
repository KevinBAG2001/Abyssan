import React from 'react';
import { GitBranch, FolderPlus, ChevronDown } from 'lucide-react';
import { GitRepoSummary, GitRepoStatus } from '../types/git';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { AbyssanLogo } from './AbyssanLogo';
import { AccionesRepositorio } from './header/AccionesRepositorio';

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
  modoAprendizaje: boolean;
  onCambiarModoAprendizaje: (activo: boolean) => void;
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
  modoAprendizaje,
  onCambiarModoAprendizaje,
}) => {
  const nombreRepo = selectedRepo
    ? repos.find((r) => r.path === selectedRepo)?.name || selectedRepo.split(/[/\\]/).pop()
    : null;

  return (
    <header className={cn(ui.chrome, 'h-14 shrink-0 px-4 flex items-center justify-between gap-3 select-none min-w-0')}>
      <SelectorRepositorio
        repos={repos}
        selectedRepo={selectedRepo}
        status={status}
        cargandoRepos={cargandoRepos}
        nombreRepo={nombreRepo ?? null}
        onSelectRepo={onSelectRepo}
        onOpenNacimiento={onOpenNacimiento}
      />

      {selectedRepo && (
        <AccionesRepositorio
          status={status}
          loading={loading}
          modoPull={modoPull}
          puedeDeshacer={puedeDeshacer}
          motivoDeshacer={motivoDeshacer}
          modoAprendizaje={modoAprendizaje}
          onPull={onPull}
          onPush={onPush}
          onRefresh={onRefresh}
          onFetch={onFetch}
          onOpenStashModal={onOpenStashModal}
          onOpenRemoteModal={onOpenRemoteModal}
          onOpenCompareModal={onOpenCompareModal}
          onToggleConsole={onToggleConsole}
          onOpenForjas={onOpenForjas}
          onDeshacer={onDeshacer}
          onOpenTimeline={onOpenTimeline}
          onOpenIdentidad={onOpenIdentidad}
          onCambiarModoPull={onCambiarModoPull}
          onCambiarModoAprendizaje={onCambiarModoAprendizaje}
        />
      )}
    </header>
  );
};

function SelectorRepositorio({
  repos,
  selectedRepo,
  status,
  cargandoRepos,
  nombreRepo,
  onSelectRepo,
  onOpenNacimiento,
}: {
  repos: GitRepoSummary[];
  selectedRepo: string | null;
  status: GitRepoStatus | null;
  cargandoRepos: boolean;
  nombreRepo: string | null;
  onSelectRepo: (repoPath: string) => void;
  onOpenNacimiento: () => void;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0 shrink">
      <div className="flex items-center gap-2 shrink-0">
        <AbyssanLogo tamano="md" className="sm:h-8" />
        <span className="text-headline-sm text-on-surface hidden sm:inline tracking-tight font-sans">ABYSSAN</span>
      </div>

      <div className="h-5 w-px bg-outline-variant shrink-0 hidden sm:block" />

      <div className="flex items-center gap-2 min-w-0">
        <label htmlFor="selector-repo" className="sr-only">Repositorio</label>
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
  );
}

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
  onAbrirPaleta: () => void;
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
  onAbrirPaleta,
}) => {
  const nombreRepo = selectedRepo
    ? repos.find((r) => r.path === selectedRepo)?.name || selectedRepo.split(/[/\\]/).pop()
    : null;

  return (
    <header
      className={cn(
        ui.chrome,
        'grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 select-none min-w-0 sm:gap-3 sm:px-4',
      )}
    >
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
          onAbrirPaleta={onAbrirPaleta}
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
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <AbyssanLogo tamano="md" className="sm:h-8" />
        <span className="text-headline-sm text-on-surface hidden sm:inline tracking-tight font-sans">ABYSSAN</span>
      </div>

      <div className="h-5 w-px bg-outline-variant shrink-0 hidden sm:block" />

      <div className="flex items-center gap-2 min-w-0">
        <label htmlFor="selector-repo" className="sr-only">Repositorio</label>
        <div className="relative flex min-w-0 flex-1 items-center">
          <GitBranch className="hidden w-4 h-4 shrink-0 text-secondary sm:block" />
          <select
            id="selector-repo"
            value={selectedRepo || ''}
            onChange={(e) => onSelectRepo(e.target.value)}
            className="w-full min-w-0 max-w-[9rem] truncate rounded border border-outline-variant bg-surface-container-high py-1.5 pl-2 pr-7 font-mono text-label-md text-on-surface transition-colors hover:bg-surface-container-highest focus:border-primary focus:outline-none cursor-pointer sm:max-w-[14rem]"
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
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 hidden w-3.5 h-3.5 -translate-y-1/2 text-on-surface-variant sm:block" />
        </div>
        <button
          type="button"
          onClick={onOpenNacimiento}
          className={cn(ui.btnIcono, 'shrink-0 touch-target')}
          title="Clonar o inicializar repositorio"
          aria-label="Clonar o inicializar repositorio"
        >
          <FolderPlus className="w-3.5 h-3.5 text-primary" />
        </button>
      </div>

      {nombreRepo && (
        <nav aria-label="Ubicación en el repositorio" className="hidden min-w-0 items-center gap-1 truncate text-code-sm text-on-surface-variant xl:flex">
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

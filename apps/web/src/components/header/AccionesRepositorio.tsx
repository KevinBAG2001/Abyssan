import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Archive,
  Terminal,
  Globe,
  GitCompare,
  Download,
  Undo2,
  GitPullRequest,
  History,
  GraduationCap,
  Command,
} from 'lucide-react';
import { GitRepoStatus } from '../../types/git';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';
import { GlifoAvatar, useAvatarIdentidad } from '../ui/avatares-identidad';
import { MenuOverflowAcciones } from './MenuOverflowAcciones';

interface AccionesRepositorioProps {
  status: GitRepoStatus | null;
  loading: boolean;
  modoPull: 'merge' | 'rebase';
  puedeDeshacer: boolean;
  motivoDeshacer?: string;
  modoAprendizaje: boolean;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  onFetch: () => void;
  onOpenStashModal: () => void;
  onOpenRemoteModal: () => void;
  onOpenCompareModal: () => void;
  onToggleConsole: () => void;
  onOpenForjas: () => void;
  onDeshacer: () => void;
  onOpenTimeline: () => void;
  onOpenIdentidad: () => void;
  onCambiarModoPull: (modo: 'merge' | 'rebase') => void;
  onCambiarModoAprendizaje: (activo: boolean) => void;
  onAbrirPaleta: () => void;
}

export const AccionesRepositorio: React.FC<AccionesRepositorioProps> = ({
  status,
  loading,
  modoPull,
  puedeDeshacer,
  motivoDeshacer,
  modoAprendizaje,
  onPull,
  onPush,
  onRefresh,
  onFetch,
  onOpenStashModal,
  onOpenRemoteModal,
  onOpenCompareModal,
  onToggleConsole,
  onOpenForjas,
  onDeshacer,
  onOpenTimeline,
  onOpenIdentidad,
  onCambiarModoPull,
  onCambiarModoAprendizaje,
  onAbrirPaleta,
}) => {
  const { avatarId } = useAvatarIdentidad();

  const itemsOverflow = [
    { id: 'compare', label: 'Comparar ramas', onClick: onOpenCompareModal, hidden: false },
    { id: 'forjas', label: 'PRs y MRs', onClick: onOpenForjas, hidden: false },
    { id: 'remotos', label: 'Remotos', onClick: onOpenRemoteModal, hidden: false },
    { id: 'stash', label: 'Stash', onClick: onOpenStashModal, hidden: false },
    { id: 'timeline', label: 'Timeline', onClick: onOpenTimeline, hidden: false },
    { id: 'paleta', label: 'Paleta de comandos', onClick: onAbrirPaleta, hidden: false },
    { id: 'identidad', label: 'Identidad git', onClick: onOpenIdentidad, hidden: false },
    {
      id: 'aprendizaje',
      label: modoAprendizaje ? 'Desactivar modo aprendizaje' : 'Modo aprendizaje',
      onClick: () => onCambiarModoAprendizaje(!modoAprendizaje),
      hidden: false,
    },
    {
      id: 'deshacer',
      label: 'Deshacer última operación',
      onClick: onDeshacer,
      disabled: loading || !puedeDeshacer,
      hidden: false,
    },
    { id: 'consola', label: 'Consola git', onClick: onToggleConsole, hidden: false },
    { id: 'refresh', label: 'Recargar repositorio', onClick: onRefresh, disabled: loading, hidden: false },
  ];

  return (
    <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
      {status && <IndicadorSyncRemoto behind={status.behind} ahead={status.ahead} />}

      <button onClick={onFetch} disabled={loading} className={cn(ui.btnSecundario, 'shrink-0 max-sm:px-2')} title="Fetch --all --prune">
        <Download className="w-3.5 h-3.5 text-secondary" />
        <span className="hidden xl:inline">Fetch</span>
      </button>

      <div className="flex shrink-0 items-center">
        <button onClick={onPull} disabled={loading} className={cn(ui.btnSecundario, 'rounded-r-none border-r-0 max-sm:px-2')} title={`Pull (${modoPull})`}>
          <ArrowDown className="w-3.5 h-3.5 text-secondary" />
          <span className="hidden xl:inline">Pull</span>
        </button>
        <select
          value={modoPull}
          onChange={(e) => onCambiarModoPull(e.target.value as 'merge' | 'rebase')}
          className="h-[30px] rounded-r border border-outline-variant bg-surface-container-high px-1 text-[12px] text-on-surface-variant focus:border-primary focus:outline-none max-sm:max-w-[4.5rem]"
          title="Modo de pull"
          aria-label="Modo de pull"
        >
          <option value="merge">merge</option>
          <option value="rebase">rebase</option>
        </select>
      </div>

      <button onClick={onPush} disabled={loading} className={cn(ui.btnPrimario, 'shrink-0 max-sm:px-2')} title="Enviar la rama al remoto (en Docker hace falta OAuth o ABYSSAN_GITHUB_TOKEN)">
        <ArrowUp className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Push</span>
      </button>

      <div className="hidden h-5 w-px shrink-0 bg-outline-variant md:block" />

      <button onClick={onOpenCompareModal} className={cn(ui.btnSecundario, 'hidden shrink-0 md:inline-flex')} title="Comparar ramas y merge">
        <GitCompare className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
        <span className="hidden 2xl:inline">Comparar</span>
      </button>

      <button onClick={onOpenForjas} className={cn(ui.btnSecundario, 'hidden shrink-0 md:inline-flex')} title="PRs y MRs">
        <GitPullRequest className="w-3.5 h-3.5 text-secondary" />
        <span className="hidden 2xl:inline">PRs</span>
      </button>

      <button onClick={onOpenRemoteModal} className={cn(ui.btnSecundario, 'hidden shrink-0 lg:inline-flex')} title="Gestor de remotos">
        <Globe className="w-3.5 h-3.5 text-secondary" />
        <span className="hidden 2xl:inline">Remotos</span>
      </button>

      <button onClick={onOpenStashModal} className={cn(ui.btnSecundario, 'hidden shrink-0 lg:inline-flex')} title="Gestor de stash">
        <Archive className="w-3.5 h-3.5 text-ember" />
        <span className="hidden 2xl:inline">Stash</span>
      </button>

      <button onClick={onOpenIdentidad} className={cn(ui.btnIcono, 'hidden xl:inline-flex')} title="Identidad git" aria-label="Identidad git">
        <span className="size-5 overflow-hidden rounded-full ring-1 ring-primary/40">
          <GlifoAvatar id={avatarId} className="block size-5 [&_svg]:size-full" />
        </span>
      </button>

      <button
        onClick={() => onCambiarModoAprendizaje(!modoAprendizaje)}
        className={cn(ui.btnIcono, 'hidden xl:inline-flex', modoAprendizaje && 'ring-1 ring-tertiary-fixed-dim bg-tertiary-fixed-dim/15')}
        title={modoAprendizaje ? 'Modo aprendizaje: activado' : 'Modo aprendizaje: desactivado'}
        aria-label="Alternar modo aprendizaje"
        aria-pressed={modoAprendizaje}
      >
        <GraduationCap className={cn('w-3.5 h-3.5', modoAprendizaje ? 'text-tertiary-fixed-dim' : 'text-on-surface-variant')} />
      </button>

      <button onClick={onOpenTimeline} className={cn(ui.btnIcono, 'hidden xl:inline-flex')} title="Timeline de operaciones" aria-label="Timeline de operaciones">
        <History className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
      </button>

      <button
        onClick={onDeshacer}
        disabled={loading || !puedeDeshacer}
        className={cn(ui.btnIcono, 'hidden xl:inline-flex')}
        title={puedeDeshacer ? 'Deshacer última operación' : motivoDeshacer || 'Nada que deshacer'}
        aria-label="Deshacer última operación"
      >
        <Undo2 className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
      </button>

      <button onClick={onToggleConsole} className={cn(ui.btnIcono, 'hidden xl:inline-flex')} title="Consola de comandos git" aria-label="Consola de comandos git">
        <Terminal className="w-3.5 h-3.5 text-primary" />
      </button>

      <button onClick={onRefresh} disabled={loading} className={cn(ui.btnIcono, 'hidden xl:inline-flex')} title="Recargar repositorio" aria-label="Recargar repositorio">
        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-primary')} />
      </button>

      <button
        type="button"
        onClick={onAbrirPaleta}
        className={cn(ui.btnIcono, 'inline-flex xl:hidden')}
        title="Paleta de comandos"
        aria-label="Paleta de comandos"
      >
        <Command className="w-3.5 h-3.5 text-primary" />
      </button>

      <MenuOverflowAcciones className="xl:hidden" items={itemsOverflow} />
    </div>
  );
};

function IndicadorSyncRemoto({ behind, ahead }: { behind: number; ahead: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded border border-outline-variant bg-surface-container px-1.5 py-1 text-label-md text-on-surface-variant sm:gap-2 sm:px-2">
      <span className="flex items-center text-secondary" title="Commits por detrás del remoto">
        <ArrowDown className="mr-0.5 w-3.5 h-3.5" />
        {behind}
      </span>
      <span className="text-outline-variant">|</span>
      <span className="flex items-center text-primary" title="Commits por delante del remoto">
        <ArrowUp className="mr-0.5 w-3.5 h-3.5" />
        {ahead}
      </span>
    </div>
  );
}

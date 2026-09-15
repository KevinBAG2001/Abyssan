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
} from 'lucide-react';
import { GitRepoStatus } from '../../types/git';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';
import { GlifoAvatar, useAvatarIdentidad } from '../ui/avatares-identidad';

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
}) => {
  const { avatarId } = useAvatarIdentidad();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full shrink-0 scrollbar-none">
      {status && <IndicadorSyncRemoto behind={status.behind} ahead={status.ahead} />}

      <button onClick={onFetch} disabled={loading} className={cn(ui.btnSecundario, 'shrink-0')} title="Fetch --all --prune">
        <Download className="w-3.5 h-3.5 text-secondary" />
        <span className="hidden xl:inline">Fetch</span>
      </button>

      <div className="flex items-center shrink-0">
        <button onClick={onPull} disabled={loading} className={cn(ui.btnSecundario, 'rounded-r-none border-r-0')} title={`Pull (${modoPull})`}>
          <ArrowDown className="w-3.5 h-3.5 text-secondary" />
          <span className="hidden xl:inline">Pull</span>
        </button>
        <select
          value={modoPull}
          onChange={(e) => onCambiarModoPull(e.target.value as 'merge' | 'rebase')}
          className="h-[30px] bg-surface-container-high border border-outline-variant rounded-r text-[10px] text-on-surface-variant px-1 focus:outline-none focus:border-primary"
          title="Modo de pull"
          aria-label="Modo de pull"
        >
          <option value="merge">merge</option>
          <option value="rebase">rebase</option>
        </select>
      </div>

      <button onClick={onPush} disabled={loading} className={cn(ui.btnPrimario, 'shrink-0')} title="Enviar la rama al remoto (en Docker hace falta OAuth o ABYSSAN_GITHUB_TOKEN)">
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
        <span className="size-5 overflow-hidden rounded-full ring-1 ring-primary/40">
          <GlifoAvatar id={avatarId} className="block size-5 [&_svg]:size-full" />
        </span>
      </button>

      <button
        onClick={() => onCambiarModoAprendizaje(!modoAprendizaje)}
        className={cn(ui.btnIcono, modoAprendizaje && 'ring-1 ring-tertiary-fixed-dim bg-tertiary-fixed-dim/15')}
        title={modoAprendizaje ? 'Modo aprendizaje: activado' : 'Modo aprendizaje: desactivado'}
        aria-label="Alternar modo aprendizaje"
        aria-pressed={modoAprendizaje}
      >
        <GraduationCap className={cn('w-3.5 h-3.5', modoAprendizaje ? 'text-tertiary-fixed-dim' : 'text-on-surface-variant')} />
      </button>

      <button onClick={onOpenTimeline} className={ui.btnIcono} title="Timeline de operaciones">
        <History className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
      </button>

      <button onClick={onDeshacer} disabled={loading || !puedeDeshacer} className={ui.btnIcono} title={puedeDeshacer ? 'Deshacer última operación' : motivoDeshacer || 'Nada que deshacer'}>
        <Undo2 className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
      </button>

      <button onClick={onToggleConsole} className={ui.btnIcono} title="Consola de comandos git">
        <Terminal className="w-3.5 h-3.5 text-primary" />
      </button>

      <button onClick={onRefresh} disabled={loading} className={ui.btnIcono} title="Recargar repositorio">
        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-primary')} />
      </button>
    </div>
  );
};

function IndicadorSyncRemoto({ behind, ahead }: { behind: number; ahead: number }) {
  return (
    <div className="flex items-center gap-2 text-label-md text-on-surface-variant px-2 py-1 bg-surface-container rounded border border-outline-variant shrink-0">
      <span className="flex items-center text-secondary" title="Commits por detrás del remoto">
        <ArrowDown className="w-3.5 h-3.5 mr-0.5" />
        {behind}
      </span>
      <span className="text-outline-variant">|</span>
      <span className="flex items-center text-primary" title="Commits por delante del remoto">
        <ArrowUp className="w-3.5 h-3.5 mr-0.5" />
        {ahead}
      </span>
    </div>
  );
}

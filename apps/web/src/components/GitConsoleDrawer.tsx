import React from 'react';
import { GitCommandLog, GitOperacion } from '../types/git';
import { Terminal, ChevronDown, ChevronUp, CheckCircle, XCircle, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { LoaderCliSpinner } from '@/components/ui/loader-cli-spinner';
import { BarraProgreso } from '@/components/ui/barra-progreso';
import { ui } from '@/lib/diseno';
import { cn } from '@/lib/utils';

interface GitConsoleDrawerProps {
  logs: GitCommandLog[];
  operaciones: GitOperacion[];
  isOpen: boolean;
  expandida: boolean;
  onToggle: () => void;
  onExpandidaChange: (expandida: boolean) => void;
  onClear: () => void;
  reflog: { hash: string; selector: string; mensaje: string; fecha: string }[];
  currentBranch?: string;
  headShortHash?: string;
  loading?: boolean;
}

function etiquetaTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    clone: 'clone',
    fetch: 'fetch',
    pull: 'pull',
    push: 'push',
    rebase: 'rebase',
    merge: 'merge',
    reset: 'reset',
    discard: 'discard',
    checkout: 'checkout',
    commit: 'commit',
    init: 'init',
    'cherry-pick': 'cherry-pick',
    revert: 'revert',
    borrarRama: 'branch -D',
    amend: 'commit --amend',
    stash: 'stash',
    deshacer: 'deshacer',
  };
  return mapa[tipo] ?? tipo;
}

function nombreRepo(ruta: string): string {
  const partes = ruta.replace(/\\/g, '/').split('/');
  return partes[partes.length - 1] || ruta;
}

function ConsolaListaOperaciones({ operaciones }: { operaciones: GitOperacion[] }) {
  if (operaciones.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-outline-variant space-y-1.5 min-w-0 overflow-x-auto">
      <div className={cn(ui.labelCaps, 'opacity-70')}>Operaciones</div>
      {operaciones.slice(0, 8).map((op) => {
        const activa = op.estado === 'corriendo' || op.estado === 'en_cola';
        return (
          <div key={op.id} className="space-y-1 rounded px-1 py-0.5 hover:bg-white/[0.02] min-w-0">
            <div className="flex items-center gap-2 min-w-0 text-on-surface">
              {activa ? (
                <LoaderCliSpinner
                  variant={op.tipo === 'clone' ? 'aesthetic' : 'braille-spin'}
                  size="0.9em"
                  ariaLabel={`${etiquetaTipo(op.tipo)} en curso`}
                />
              ) : op.estado === 'exito' ? (
                <CheckCircle className="w-3 h-3 text-primary shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-error shrink-0" />
              )}
              <span className="text-primary shrink-0">$</span>
              <span className="flex-1 min-w-0 truncate">
                git {etiquetaTipo(op.tipo)}
                <span className="text-on-surface-variant/70"> · {nombreRepo(op.repo)}</span>
                {op.etapa && <span className="text-on-surface-variant/70"> — {op.etapa}</span>}
              </span>
              <span className="shrink-0 text-code-sm text-on-surface-variant/70 tabular-nums">{op.estado}</span>
            </div>
            {activa && <BarraProgreso valor={op.progreso} etiqueta={`Progreso de ${op.tipo}`} />}
            {op.error && <p className="text-error pl-5">{op.error}</p>}
          </div>
        );
      })}
    </div>
  );
}

function ConsolaListaLogs({
  logs,
  reflog,
  hayOperaciones,
}: {
  logs: GitCommandLog[];
  reflog: GitConsoleDrawerProps['reflog'];
  hayOperaciones: boolean;
}) {
  return (
    <div className="p-3 space-y-1">
      {reflog.length > 0 && (
        <div className="mb-2 pb-2 border-b border-outline-variant">
          <div className={cn(ui.labelCaps, 'opacity-70 mb-1')}>Reflog (red de emergencia)</div>
          {reflog.slice(0, 12).map((r) => (
            <div key={`${r.hash}-${r.selector}-${r.fecha}`} className="flex gap-2 text-on-surface-variant py-0.5">
              <span className="text-primary font-mono w-14 shrink-0">{r.hash}</span>
              <span className="truncate">{r.mensaje}</span>
            </div>
          ))}
        </div>
      )}
      {logs.length === 0 && reflog.length === 0 && !hayOperaciones ? (
        <div className="text-on-surface-variant/50 italic py-2">No se han ejecutado comandos aún en esta sesión.</div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-white/[0.02] rounded px-1">
            <span className="text-on-surface-variant/70 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
            {log.success ? (
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
            )}
            <span className="text-primary font-bold shrink-0">&gt;</span>
            <span className={cn('font-mono flex-1', log.success ? 'text-on-surface' : 'text-error')}>
              {log.command}
              {log.error && <span className="text-error block mt-0.5">{log.error}</span>}
            </span>
            <span className="text-on-surface-variant/70 text-code-sm shrink-0">{log.durationMs}ms</span>
          </div>
        ))
      )}
    </div>
  );
}

function ConsolaMetaHead({ headShortHash, currentBranch }: { headShortHash?: string; currentBranch?: string }) {
  if (!headShortHash && !currentBranch) return null;

  return (
    <span className="hidden md:flex items-center gap-1.5 text-code-sm text-on-surface-variant truncate">
      <span className="text-on-surface-variant/50">|</span>
      {headShortHash && (
        <>
          <span className="text-on-surface-variant/70">HEAD</span>
          <span className="text-secondary font-mono">{headShortHash}</span>
        </>
      )}
      {currentBranch && (
        <>
          <span className="text-on-surface-variant/50">·</span>
          <span className="text-primary truncate max-w-[8rem]">{currentBranch}</span>
        </>
      )}
    </span>
  );
}

function ConsolaAccionesBarra({
  isOpen,
  expandida,
  onToggle,
  onClear,
  onExpandidaChange,
}: {
  isOpen: boolean;
  expandida: boolean;
  onToggle: () => void;
  onClear: () => void;
  onExpandidaChange: (expandida: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {isOpen && (
        <button
          type="button"
          onClick={onClear}
          className="text-code-sm text-on-surface-variant hover:text-error flex items-center gap-1 transition-colors"
          title="Limpiar consola"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      )}
      {isOpen && (
        <button
          type="button"
          onClick={() => onExpandidaChange(!expandida)}
          className={ui.btnIcono}
          title={expandida ? 'Reducir consola' : 'Expandir consola'}
          aria-label={expandida ? 'Reducir consola' : 'Expandir consola'}
        >
          {expandida ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      )}
      <button type="button" onClick={onToggle} aria-label={isOpen ? 'Cerrar consola' : 'Abrir consola'} className={ui.btnIcono}>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ConsolaBarraTitulo({
  estadoListo,
  headShortHash,
  currentBranch,
  logsCount,
  enVueloCount,
  isOpen,
  expandida,
  onToggle,
  onClear,
  onExpandidaChange,
}: {
  estadoListo: boolean;
  headShortHash?: string;
  currentBranch?: string;
  logsCount: number;
  enVueloCount: number;
  isOpen: boolean;
  expandida: boolean;
  onToggle: () => void;
  onClear: () => void;
  onExpandidaChange: (expandida: boolean) => void;
}) {
  return (
    <div className="h-8 bg-surface-container-low px-3 sm:px-4 flex items-center justify-between gap-2 hover:bg-surface-container transition-colors min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-code-sm font-medium text-on-surface-variant min-w-0 flex-1 text-left"
      >
        <span
          className={cn(
            'size-2 rounded-full shrink-0',
            estadoListo ? 'bg-primary glow-biolume-sm' : 'bg-ember animate-pulse'
          )}
          title={estadoListo ? 'Listo' : 'Operación en curso'}
        />
        <span className="text-primary font-semibold hidden sm:inline">{estadoListo ? 'Ready' : 'Busy'}</span>
        <ConsolaMetaHead headShortHash={headShortHash} currentBranch={currentBranch} />
        <Terminal className="w-3.5 h-3.5 text-primary shrink-0 sm:ml-1" />
        <span className="truncate hidden sm:inline">Consola Git</span>
        <span className="px-1.5 py-0.5 rounded-full bg-surface-container-highest text-code-sm text-on-surface-variant font-mono shrink-0">
          {logsCount}
        </span>
        {enVueloCount > 0 && (
          <span className="flex items-center gap-1 text-code-sm text-primary font-mono shrink-0">
            <LoaderCliSpinner variant="braille-spin" size="0.85em" ariaLabel="Operación en curso" />
            <span className="hidden lg:inline">{enVueloCount} en curso</span>
          </span>
        )}
      </button>

      <ConsolaAccionesBarra
        isOpen={isOpen}
        expandida={expandida}
        onToggle={onToggle}
        onClear={onClear}
        onExpandidaChange={onExpandidaChange}
      />
    </div>
  );
}

export const GitConsoleDrawer: React.FC<GitConsoleDrawerProps> = ({
  logs,
  operaciones,
  isOpen,
  expandida,
  onToggle,
  onExpandidaChange,
  onClear,
  reflog,
  currentBranch,
  headShortHash,
  loading = false,
}) => {
  const enVuelo = operaciones.filter((o) => o.estado === 'en_cola' || o.estado === 'corriendo');
  const ocupado = loading || enVuelo.length > 0;
  const estadoListo = !ocupado;

  return (
    <div className="border-t border-outline-variant bg-void flex flex-col transition-[height] duration-200 select-none shrink-0">
      <ConsolaBarraTitulo
        estadoListo={estadoListo}
        headShortHash={headShortHash}
        currentBranch={currentBranch}
        logsCount={logs.length}
        enVueloCount={enVuelo.length}
        isOpen={isOpen}
        expandida={expandida}
        onToggle={onToggle}
        onClear={onClear}
        onExpandidaChange={onExpandidaChange}
      />

      {isOpen && (
        <div
          className={cn(
            'overflow-y-auto text-code-sm bg-void font-mono transition-[height] duration-200',
            expandida ? 'h-[min(28rem,45vh)]' : 'h-52'
          )}
        >
          <div className="flex items-center gap-1.5 border-b border-outline-variant px-4 py-2 bg-void">
            <span className="size-2.5 rounded-full bg-magma/80" />
            <span className="size-2.5 rounded-full bg-ember/80" />
            <span className="size-2.5 rounded-full bg-primary/80" />
            <span className="ml-2 text-code-sm text-on-surface-variant/70">abyssan — git</span>
          </div>

          <ConsolaListaOperaciones operaciones={operaciones} />
          <ConsolaListaLogs logs={logs} reflog={reflog} hayOperaciones={operaciones.length > 0} />
        </div>
      )}
    </div>
  );
};

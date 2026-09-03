import React from 'react';
import { GitCommandLog, GitOperacion } from '../types/git';
import { Terminal, ChevronDown, ChevronUp, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { LoaderCliSpinner } from '@/components/ui/loader-cli-spinner';
import { BarraProgreso } from '@/components/ui/barra-progreso';

interface GitConsoleDrawerProps {
  logs: GitCommandLog[];
  operaciones: GitOperacion[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  reflog: { hash: string; selector: string; mensaje: string; fecha: string }[];
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

export const GitConsoleDrawer: React.FC<GitConsoleDrawerProps> = ({
  logs,
  operaciones,
  isOpen,
  onToggle,
  onClear,
  reflog,
}) => {
  const enVuelo = operaciones.filter((o) => o.estado === 'en_cola' || o.estado === 'corriendo');

  return (
    <div className="border-t border-outline-variant bg-void flex flex-col transition-[height] duration-200 select-none">
      <div className="h-8 bg-surface-container-low px-4 flex items-center justify-between hover:bg-surface-container transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center space-x-2 text-xs font-semibold text-on-surface-variant min-w-0 flex-1 text-left"
        >
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>Consola de Comandos Git</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-[10px] text-on-surface-variant font-mono">
            {logs.length}
          </span>
          {enVuelo.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-primary font-mono">
              <LoaderCliSpinner variant="braille-spin" size="0.85em" ariaLabel="Operación en curso" />
              {enVuelo.length} en curso
            </span>
          )}
        </button>

        <div className="flex items-center space-x-3">
          {isOpen && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-on-surface-variant hover:text-error flex items-center space-x-1 transition-colors"
              title="Limpiar Consola"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
          <button type="button" onClick={onToggle} aria-label={isOpen ? 'Cerrar consola' : 'Abrir consola'}>
            {isOpen ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronUp className="w-4 h-4 text-on-surface-variant" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="h-52 overflow-y-auto font-mono text-[11px] bg-void">
          <div className="flex items-center gap-1.5 border-b border-outline-variant px-4 py-2 bg-void">
            <span className="size-2.5 rounded-full bg-magma/80" />
            <span className="size-2.5 rounded-full bg-ember/80" />
            <span className="size-2.5 rounded-full bg-primary/80" />
            <span className="ml-2 text-[10px] text-on-surface-variant/70">abyssan — git</span>
          </div>

          {operaciones.length > 0 && (
            <div className="px-3 py-2 border-b border-outline-variant space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">Operaciones</div>
              {operaciones.slice(0, 8).map((op) => {
                const activa = op.estado === 'corriendo' || op.estado === 'en_cola';
                return (
                  <div key={op.id} className="space-y-1 rounded px-1 py-0.5 hover:bg-white/[0.02]">
                    <p className="flex items-center gap-2 text-on-surface">
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
                      <span className="text-primary">$</span>
                      <span>
                        git {etiquetaTipo(op.tipo)}
                        <span className="text-on-surface-variant/70"> · {nombreRepo(op.repo)}</span>
                      </span>
                      {op.etapa && <span className="text-on-surface-variant/70 truncate">{op.etapa}</span>}
                      <span className="ml-auto text-[10px] text-on-surface-variant/70">{op.estado}</span>
                    </p>
                    {activa && <BarraProgreso valor={op.progreso} etiqueta={`Progreso de ${op.tipo}`} />}
                    {op.error && <p className="text-error pl-5">{op.error}</p>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 space-y-1">
            {reflog.length > 0 && (
              <div className="mb-2 pb-2 border-b border-outline-variant">
                <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">
                  Reflog (red de emergencia)
                </div>
                {reflog.slice(0, 12).map((r) => (
                  <div key={`${r.hash}-${r.selector}-${r.fecha}`} className="flex space-x-2 text-on-surface-variant py-0.5">
                    <span className="text-primary font-mono w-14 shrink-0">{r.hash}</span>
                    <span className="truncate">{r.mensaje}</span>
                  </div>
                ))}
              </div>
            )}
            {logs.length === 0 && reflog.length === 0 && operaciones.length === 0 ? (
              <div className="text-on-surface-variant/50 italic py-2">No se han ejecutado comandos aún en esta sesión.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 py-0.5 hover:bg-white/[0.02] rounded px-1">
                  <span className="text-on-surface-variant/70 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.success ? (
                    <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                  )}
                  <span className="text-primary font-bold shrink-0">&gt;</span>
                  <span className={`font-mono flex-1 ${log.success ? 'text-on-surface' : 'text-error'}`}>
                    {log.command}
                    {log.error && <span className="text-error block mt-0.5">{log.error}</span>}
                  </span>
                  <span className="text-on-surface-variant/70 text-[10px] shrink-0">{log.durationMs}ms</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

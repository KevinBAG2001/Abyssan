import React from 'react';
import { GitCommandLog } from '../types/git';
import { Terminal, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

interface GitConsoleDrawerProps {
  logs: GitCommandLog[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export const GitConsoleDrawer: React.FC<GitConsoleDrawerProps> = ({
  logs,
  isOpen,
  onToggle,
  onClear,
}) => {
  return (
    <div className="border-t border-[#23283b] bg-[#0d0f17] flex flex-col transition-all duration-200 select-none">
      {/* Barra de control de la Consola */}
      <div
        onClick={onToggle}
        className="h-8 bg-[#141724] px-4 flex items-center justify-between cursor-pointer hover:bg-[#181c2d] transition-colors"
      >
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Consola de Comandos Git</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#23283b] text-[10px] text-slate-400 font-mono">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
              title="Limpiar Consola"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Contenido desplegable de logs */}
      {isOpen && (
        <div className="h-44 overflow-y-auto p-3 font-['JetBrains_Mono',monospace] text-[11px] space-y-1 bg-[#090a10]">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-2">No se han ejecutado comandos aún en esta sesión.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 py-0.5 hover:bg-white/[0.02] rounded px-1">
                <span className="text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {log.success ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="text-emerald-300 font-bold shrink-0">&gt;</span>
                <span className={`font-mono flex-1 ${log.success ? 'text-slate-200' : 'text-rose-300'}`}>
                  {log.command}
                  {log.error && <span className="text-rose-400 block mt-0.5">{log.error}</span>}
                </span>
                <span className="text-slate-500 text-[10px] shrink-0">{log.durationMs}ms</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

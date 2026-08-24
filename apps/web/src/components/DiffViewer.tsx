import React, { useMemo } from 'react';
import { FileCode, Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  filePath: string;
  isStaged: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, filePath, isStaged }) => {
  const parsedLines = useMemo(() => {
    if (!diff) return [];

    const lines = diff.split('\n');
    return lines.map((line, index) => {
      let type: 'header' | 'addition' | 'deletion' | 'normal' = 'normal';

      if (line.startsWith('@@')) {
        type = 'header';
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        type = 'addition';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        type = 'deletion';
      }

      return {
        id: index,
        raw: line,
        type,
      };
    });
  }, [diff]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    parsedLines.forEach((l) => {
      if (l.type === 'addition') additions++;
      if (l.type === 'deletion') deletions++;
    });
    return { additions, deletions };
  }, [parsedLines]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f17] overflow-hidden">
      {/* Barra de Archivo y Estadísticas de Diff */}
      <div className="h-10 bg-[#141724] border-b border-[#23283b] px-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2 truncate">
          <FileCode className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono font-medium text-slate-200 truncate">{filePath}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
              isStaged
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isStaged ? 'Staged' : 'Unstaged'}
          </span>
        </div>

        {/* Contador + / - */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="flex items-center text-emerald-400">
            <Plus className="w-3 h-3 mr-0.5" />
            {stats.additions}
          </span>
          <span className="flex items-center text-rose-400">
            <Minus className="w-3 h-3 mr-0.5" />
            {stats.deletions}
          </span>
        </div>
      </div>

      {/* Visor de Líneas de Código */}
      <div className="flex-1 overflow-auto font-['JetBrains_Mono',monospace] text-xs p-2">
        {parsedLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 italic">
            Sin diferencias para mostrar en este archivo
          </div>
        ) : (
          <div className="space-y-[1px]">
            {parsedLines.map((line) => {
              let bgClass = 'hover:bg-white/[0.02] text-slate-300';
              let indicatorColor = 'text-transparent';

              if (line.type === 'header') {
                bgClass = 'bg-sky-950/40 text-sky-300 py-1 font-bold';
              } else if (line.type === 'addition') {
                bgClass = 'bg-emerald-950/40 text-emerald-300';
                indicatorColor = 'text-emerald-400';
              } else if (line.type === 'deletion') {
                bgClass = 'bg-rose-950/40 text-rose-300';
                indicatorColor = 'text-rose-400';
              }

              return (
                <div
                  key={line.id}
                  className={`flex items-start px-2 py-0.5 rounded-xs transition-colors ${bgClass}`}
                >
                  <span className={`w-4 shrink-0 font-bold select-none ${indicatorColor}`}>
                    {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
                  </span>
                  <pre className="flex-1 overflow-x-auto whitespace-pre font-mono leading-relaxed">
                    {line.raw.substring(line.type === 'addition' || line.type === 'deletion' ? 1 : 0)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

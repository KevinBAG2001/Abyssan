import React, { useState, useEffect } from 'react';
import { GitConflictData } from '../types/git';
import { Check, ArrowLeft, Code2, ShieldAlert, Ban } from 'lucide-react';

interface ConflictResolverProps {
  conflictData: GitConflictData;
  loading: boolean;
  isMerging?: boolean;
  onResolve: (resolvedContent: string) => void;
  onCancel: () => void;
  onAbortMerge?: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflictData,
  loading,
  isMerging,
  onResolve,
  onCancel,
  onAbortMerge,
}) => {
  const [resolvedText, setResolvedText] = useState(conflictData.rawConflict);
  const hunks = conflictData.hunks || [];
  const baseDisponible = conflictData.baseDisponible ?? Boolean(conflictData.baseContent);

  useEffect(() => {
    setResolvedText(conflictData.rawConflict);
  }, [conflictData]);

  const handleAcceptCurrent = () => setResolvedText(conflictData.currentContent);
  const handleAcceptIncoming = () => setResolvedText(conflictData.incomingContent);
  const handleAcceptBoth = () => {
    if (hunks.length > 0) {
      setResolvedText(hunks.map((h) => `${h.actual}${h.entrante}`).join(''));
      return;
    }
    setResolvedText(`${conflictData.currentContent}\n${conflictData.incomingContent}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f17] overflow-hidden select-none">
      <div className="h-12 bg-[#141724] border-b border-[#23283b] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-[#23283b] text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">Conflicto 3-way:</span>
            <span className="text-xs font-mono text-emerald-400">{conflictData.filePath}</span>
            {hunks.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {hunks.length} bloques
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isMerging && onAbortMerge && (
            <button
              onClick={onAbortMerge}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold rounded border border-rose-500/30"
            >
              <Ban className="w-3 h-3" />
              <span>Abortar merge</span>
            </button>
          )}
          <button
            onClick={handleAcceptCurrent}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-sky-400 font-semibold rounded border border-sky-500/30"
          >
            Aceptar actual
          </button>
          <button
            onClick={handleAcceptIncoming}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-purple-400 font-semibold rounded border border-purple-500/30"
          >
            Aceptar entrante
          </button>
          <button
            onClick={handleAcceptBoth}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 font-semibold rounded border border-[#2e354e]"
          >
            Aceptar ambos
          </button>
          <button
            onClick={() => onResolve(resolvedText)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Resolver y stage</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 divide-x divide-[#23283b] overflow-hidden">
        <Columna titulo="Base" tono="slate" vacio={!baseDisponible ? 'No disponible (sin ancestor)' : undefined}>
          {conflictData.baseContent}
        </Columna>
        <Columna titulo="Actual (ours / HEAD)" tono="sky">
          {conflictData.currentContent}
        </Columna>
        <div className="flex flex-col h-full overflow-hidden bg-[#0d0f17]">
          <div className="p-2.5 bg-emerald-950/30 border-b border-emerald-900/30 text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>Resultado (editable)</span>
          </div>
          <textarea
            value={resolvedText}
            onChange={(e) => setResolvedText(e.target.value)}
            className="flex-1 w-full bg-transparent p-3 font-mono text-xs text-slate-100 resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
          />
        </div>
        <Columna titulo="Entrante (theirs)" tono="purple">
          {conflictData.incomingContent}
        </Columna>
      </div>
    </div>
  );
};

const Columna: React.FC<{
  titulo: string;
  tono: 'sky' | 'purple' | 'slate';
  vacio?: string;
  children?: string;
}> = ({ titulo, tono, vacio, children }) => {
  const colores = {
    sky: 'bg-sky-950/30 border-sky-900/30 text-sky-400 text-sky-200',
    purple: 'bg-purple-950/30 border-purple-900/30 text-purple-400 text-purple-200',
    slate: 'bg-slate-900/40 border-slate-800 text-slate-400 text-slate-300',
  }[tono].split(' ');
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#10131e]">
      <div className={`p-2.5 ${colores[0]} border-b ${colores[1]} text-xs font-semibold ${colores[2]}`}>
        {titulo}
      </div>
      <div className={`flex-1 overflow-auto p-3 font-mono text-xs whitespace-pre leading-relaxed ${colores[3]}`}>
        {vacio ? <span className="text-slate-600 italic">{vacio}</span> : children || <span className="text-slate-600 italic">Vacío</span>}
      </div>
    </div>
  );
};

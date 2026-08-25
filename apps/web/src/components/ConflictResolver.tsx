import React, { useState, useEffect } from 'react';
import { GitConflictData } from '../types/git';
import { Check, ArrowLeft, Code2, ShieldAlert } from 'lucide-react';

interface ConflictResolverProps {
  conflictData: GitConflictData;
  loading: boolean;
  onResolve: (resolvedContent: string) => void;
  onCancel: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflictData,
  loading,
  onResolve,
  onCancel,
}) => {
  const [resolvedText, setResolvedText] = useState(conflictData.rawConflict);

  useEffect(() => {
    // Si podemos extraer current e incoming, por defecto presentamos una resolución limpia
    if (conflictData.currentContent || conflictData.incomingContent) {
      setResolvedText(conflictData.currentContent || conflictData.incomingContent);
    }
  }, [conflictData]);

  const handleAcceptCurrent = () => {
    setResolvedText(conflictData.currentContent);
  };

  const handleAcceptIncoming = () => {
    setResolvedText(conflictData.incomingContent);
  };

  const handleAcceptBoth = () => {
    setResolvedText(`${conflictData.currentContent}\n${conflictData.incomingContent}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f17] overflow-hidden select-none">
      {/* Encabezado del Editor de Conflictos */}
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
            <span className="text-xs font-bold text-white">Resolviendo Conflicto:</span>
            <span className="text-xs font-mono text-emerald-400">{conflictData.filePath}</span>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAcceptCurrent}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-sky-400 font-semibold rounded border border-sky-500/30 transition-colors"
          >
            Aceptar Actual (HEAD)
          </button>
          <button
            onClick={handleAcceptIncoming}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-purple-400 font-semibold rounded border border-purple-500/30 transition-colors"
          >
            Aceptar Entrante
          </button>
          <button
            onClick={handleAcceptBoth}
            className="px-2.5 py-1 text-xs bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 font-semibold rounded border border-[#2e354e] transition-colors"
          >
            Aceptar Ambos
          </button>
          <div className="h-4 w-[1px] bg-[#23283b]" />
          <button
            onClick={() => onResolve(resolvedText)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs rounded shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marcar Resuelto & Stage</span>
          </button>
        </div>
      </div>

      {/* Vista de 3 Vías: Current | Result Editable | Incoming */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-[#23283b] overflow-hidden">
        {/* Columna 1: Cambio Actual (HEAD) */}
        <div className="flex flex-col h-full overflow-hidden bg-[#10131e]">
          <div className="p-2.5 bg-sky-950/30 border-b border-sky-900/30 flex items-center justify-between text-xs font-semibold text-sky-400">
            <span>Cambio Actual (Local / HEAD)</span>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-xs text-sky-200 whitespace-pre leading-relaxed">
            {conflictData.currentContent || <span className="text-slate-600 italic">Vacío</span>}
          </div>
        </div>

        {/* Columna 2: Resultado Final Resuelto (Editor) */}
        <div className="flex flex-col h-full overflow-hidden bg-[#0d0f17]">
          <div className="p-2.5 bg-emerald-950/30 border-b border-emerald-900/30 flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span className="flex items-center space-x-1.5">
              <Code2 className="w-3.5 h-3.5" />
              <span>Resultado Combinado (Editable)</span>
            </span>
          </div>
          <textarea
            value={resolvedText}
            onChange={(e) => setResolvedText(e.target.value)}
            className="flex-1 w-full bg-transparent p-3 font-mono text-xs text-slate-100 resize-none focus:outline-none leading-relaxed border-none"
            placeholder="Edita el resultado final aquí..."
            spellCheck={false}
          />
        </div>

        {/* Columna 3: Cambio Entrante (Remote / Incoming) */}
        <div className="flex flex-col h-full overflow-hidden bg-[#10131e]">
          <div className="p-2.5 bg-purple-950/30 border-b border-purple-900/30 flex items-center justify-between text-xs font-semibold text-purple-400">
            <span>Cambio Entrante (Rama / Remoto)</span>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-xs text-purple-200 whitespace-pre leading-relaxed">
            {conflictData.incomingContent || <span className="text-slate-600 italic">Vacío</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

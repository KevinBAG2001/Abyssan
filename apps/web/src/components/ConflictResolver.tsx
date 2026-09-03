import React, { useState } from 'react';
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
    <div className="flex-1 flex flex-col h-full bg-void overflow-hidden select-none">
      <div className="h-12 bg-surface-container-low border-b border-outline-variant px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-md transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-ember" />
            <span className="text-xs font-bold text-on-surface">Conflicto 3-way:</span>
            <span className="text-xs font-mono text-primary">{conflictData.filePath}</span>
            {hunks.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-ember/20 text-ember">
                {hunks.length} bloques
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isMerging && onAbortMerge && (
            <button
              onClick={onAbortMerge}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-error-container/40 hover:bg-rose-900/50 text-error font-semibold rounded border border-error/30"
            >
              <Ban className="w-3 h-3" />
              <span>Abortar merge</span>
            </button>
          )}
          <button
            onClick={handleAcceptCurrent}
            className="px-2.5 py-1 text-xs bg-surface-container-high hover:bg-surface-container-highest text-secondary font-semibold rounded border border-secondary/30"
          >
            Aceptar actual
          </button>
          <button
            onClick={handleAcceptIncoming}
            className="px-2.5 py-1 text-xs bg-surface-container-high hover:bg-surface-container-highest text-tertiary-fixed-dim font-semibold rounded border border-tertiary-fixed-dim/30"
          >
            Aceptar entrante
          </button>
          <button
            onClick={handleAcceptBoth}
            className="px-2.5 py-1 text-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-semibold rounded border border-outline-variant"
          >
            Aceptar ambos
          </button>
          <button
            onClick={() => onResolve(resolvedText)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1 bg-primary-container hover:brightness-110 text-on-primary font-bold text-xs rounded disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Resolver y stage</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 divide-x divide-outline-variant overflow-hidden">
        <Columna titulo="Base" tono="slate" vacio={!baseDisponible ? 'No disponible (sin ancestor)' : undefined}>
          {conflictData.baseContent}
        </Columna>
        <Columna titulo="Actual (ours / HEAD)" tono="sky">
          {conflictData.currentContent}
        </Columna>
        <div className="flex flex-col h-full overflow-hidden bg-void">
          <label htmlFor="resultado-conflicto" className="p-2.5 bg-primary-container/30 border-b border-primary/30 text-label-md font-semibold text-primary flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>Resultado (editable)</span>
          </label>
          <textarea
            id="resultado-conflicto"
            value={resolvedText}
            onChange={(e) => setResolvedText(e.target.value)}
            className="flex-1 w-full bg-transparent p-3 font-mono text-xs text-on-surface resize-none focus:outline-none leading-relaxed"
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
    sky: 'bg-secondary-container/30 border-sky-900/30 text-secondary text-sky-200',
    purple: 'bg-tertiary-container/30 border-purple-900/30 text-tertiary-fixed-dim text-tertiary',
    slate: 'bg-surface-container-high/40 border-outline-variant text-on-surface-variant',
  }[tono].split(' ');
  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-container">
      <div className={`p-2.5 ${colores[0]} border-b ${colores[1]} text-xs font-semibold ${colores[2]}`}>
        {titulo}
      </div>
      <div className={`flex-1 overflow-auto p-3 font-mono text-xs whitespace-pre leading-relaxed ${colores[3]}`}>
        {vacio ? <span className="text-on-surface-variant/50 italic">{vacio}</span> : children || <span className="text-on-surface-variant/50 italic">Vacío</span>}
      </div>
    </div>
  );
};

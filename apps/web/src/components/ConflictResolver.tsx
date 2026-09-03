import React, { useState } from 'react';
import { GitConflictData } from '../types/git';
import { Check, ArrowLeft, Code2, ShieldAlert, Ban } from 'lucide-react';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

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
    <div className="flex-1 flex flex-col h-full bg-void overflow-hidden select-none font-mono min-w-0">
      <div className="min-h-12 bg-surface-container-low border-b border-outline-variant px-3 sm:px-4 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={onCancel} className={ui.btnIcono} aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ShieldAlert className="w-4 h-4 text-magma shrink-0" />
          <span className={cn(ui.labelCaps, 'shrink-0')}>Conflicto 3-way</span>
          <span className="text-code-sm text-primary truncate">{conflictData.filePath}</span>
          {hunks.length > 1 && (
            <span className="text-code-sm px-1.5 py-0.5 rounded bg-magma/15 text-magma border border-magma/30 shrink-0">
              {hunks.length} bloques
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {isMerging && onAbortMerge && (
            <button type="button" onClick={onAbortMerge} className={cn(ui.btnDestructivo, 'text-code-sm py-1')}>
              <Ban className="w-3 h-3" />
              <span className="hidden sm:inline">Abortar merge</span>
            </button>
          )}
          <button type="button" onClick={handleAcceptCurrent} className={cn(ui.btnGhost, 'text-code-sm py-1 border-secondary/40')}>
            Actual
          </button>
          <button type="button" onClick={handleAcceptIncoming} className={cn(ui.btnGhost, 'text-code-sm py-1 border-tertiary-fixed-dim/40 text-tertiary-fixed-dim')}>
            Entrante
          </button>
          <button type="button" onClick={handleAcceptBoth} className={cn(ui.btnSecundario, 'text-code-sm py-1')}>
            Ambos
          </button>
          <button
            type="button"
            onClick={() => onResolve(resolvedText)}
            disabled={loading}
            className={cn(ui.btnPrimario, 'text-code-sm py-1')}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resolver y stage</span>
            <span className="sm:hidden">Resolver</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant overflow-hidden min-h-0">
        <ColumnaConflicto titulo="Base" variante="base" vacio={!baseDisponible ? 'Sin ancestro común' : undefined}>
          {conflictData.baseContent}
        </ColumnaConflicto>
        <ColumnaConflicto titulo="Actual (HEAD)" variante="actual">
          {conflictData.currentContent}
        </ColumnaConflicto>

        <div className="flex flex-col h-full overflow-hidden bg-void min-h-[12rem] md:min-h-0 order-last xl:order-none">
          <label
            htmlFor="resultado-conflicto"
            className="px-3 py-2 bg-primary-container/15 border-b border-primary/30 text-code-sm font-semibold text-primary flex items-center gap-1.5 shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" />
            Resultado (editable)
          </label>
          <textarea
            id="resultado-conflicto"
            value={resolvedText}
            onChange={(e) => setResolvedText(e.target.value)}
            className="flex-1 w-full bg-transparent p-3 font-mono text-code-sm text-on-surface resize-none focus:outline-none leading-relaxed min-h-[10rem]"
            spellCheck={false}
          />
        </div>

        <ColumnaConflicto titulo="Entrante (theirs)" variante="entrante">
          {conflictData.incomingContent}
        </ColumnaConflicto>
      </div>
    </div>
  );
};

const VARIANTES = {
  base: {
    header: 'bg-surface-container-high/60 border-outline-variant text-on-surface-variant',
    body: 'text-on-surface-variant',
  },
  actual: {
    header: 'bg-secondary-container/20 border-secondary/30 text-secondary',
    body: 'text-on-surface',
  },
  entrante: {
    header: 'bg-tertiary-container/20 border-tertiary-fixed-dim/30 text-tertiary-fixed-dim',
    body: 'text-on-surface',
  },
} as const;

function ColumnaConflicto({
  titulo,
  variante,
  vacio,
  children,
}: {
  titulo: string;
  variante: keyof typeof VARIANTES;
  vacio?: string;
  children?: string;
}) {
  const v = VARIANTES[variante];
  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-container min-h-[10rem] md:min-h-0">
      <div className={cn('px-3 py-2 border-b text-code-sm font-semibold shrink-0', v.header)}>{titulo}</div>
      <div className={cn('flex-1 overflow-auto p-3 font-mono text-code-sm whitespace-pre leading-relaxed', v.body)}>
        {vacio ? (
          <span className="text-on-surface-variant/50 italic">{vacio}</span>
        ) : (
          children || <span className="text-on-surface-variant/50 italic">Vacío</span>
        )}
      </div>
    </div>
  );
}

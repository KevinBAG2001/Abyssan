import React, { useState, useEffect } from 'react';
import { GitBranch, GitBranchComparison } from '../types/git';
import { GitCompare, ArrowRight, Merge, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

interface BranchCompareModalProps {
  repoPath: string;
  branches: GitBranch[];
  currentBranch: string;
  loading: boolean;
  onMerge: (sourceBranch: string, noFf: boolean) => void;
  onClose: () => void;
}

const selectRama =
  'w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-1.5 text-code-sm text-on-surface font-mono focus:outline-none focus:border-tertiary-fixed-dim';

export const BranchCompareModal: React.FC<BranchCompareModalProps> = ({
  repoPath,
  branches,
  currentBranch,
  loading,
  onMerge,
  onClose,
}) => {
  const [baseBranch, setBaseBranch] = useState(currentBranch);
  const [targetBranch, setTargetBranch] = useState(
    () => branches.find((b) => b.name !== currentBranch)?.name || currentBranch
  );
  const [comparison, setComparison] = useState<GitBranchComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [noFf, setNoFf] = useState(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      if (!baseBranch || !targetBranch || baseBranch === targetBranch) {
        if (vivo) setComparison(null);
        return;
      }
      setComparing(true);
      try {
        const data = await httpGitApi.compareBranches(repoPath, baseBranch, targetBranch);
        if (vivo) setComparison(data);
      } catch {
        if (vivo) setComparison(null);
      } finally {
        if (vivo) setComparing(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [repoPath, baseBranch, targetBranch]);

  const fusionar = () => {
    if (!comparison || comparison.aheadCount === 0) return;
    if (confirm(`¿Fusionar la rama "${targetBranch}" en "${baseBranch}"?`)) {
      onMerge(targetBranch, noFf);
      onClose();
    }
  };

  return (
    <ModalCapa ancho="compare" onCerrar={onClose} labelledBy="titulo-compare" className="bg-surface-container select-none max-h-[85vh] flex flex-col">
      <ModalEncabezado
        id="titulo-compare"
        titulo="Comparar y fusionar ramas"
        subtitulo="Ahead/behind y vista previa de commits"
        icono={<GitCompare className="w-4 h-4 text-tertiary-fixed-dim" />}
        onCerrar={onClose}
      />

      <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor="rama-base" className={cn(ui.labelCaps, 'block mb-1')}>
            Rama base (destino)
          </label>
          <select id="rama-base" value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} className={selectRama}>
            {branches.map((b) => (
              <option key={`base-${b.name}`} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-4 h-4 text-on-surface-variant/70 hidden sm:block shrink-0 mb-2" />

        <div className="flex-1 min-w-0">
          <label htmlFor="rama-origen" className={cn(ui.labelCaps, 'block mb-1')}>
            Rama origen
          </label>
          <select id="rama-origen" value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className={selectRama}>
            {branches.map((b) => (
              <option key={`target-${b.name}`} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {comparing ? (
          <div className="text-center py-10 text-code-sm text-on-surface-variant">Analizando diferencias entre ramas…</div>
        ) : !comparison ? (
          <div className="text-center py-10 text-code-sm text-on-surface-variant/70 italic">
            Selecciona dos ramas diferentes para ver el resumen
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={cn(ui.panelInset, 'p-3 flex items-center gap-3')}>
                <div className="p-2 rounded-md bg-primary-container/10 text-primary">
                  <ArrowUp className="w-4 h-4" />
                </div>
                <div>
                  <span className={cn(ui.labelCaps, 'block opacity-70')}>Ahead</span>
                  <span className="text-xl font-bold text-on-surface font-mono">{comparison.aheadCount}</span>
                </div>
              </div>

              <div className={cn(ui.panelInset, 'p-3 flex items-center gap-3')}>
                <div className="p-2 rounded-md bg-secondary-container/10 text-secondary">
                  <ArrowDown className="w-4 h-4" />
                </div>
                <div>
                  <span className={cn(ui.labelCaps, 'block opacity-70')}>Behind</span>
                  <span className="text-xl font-bold text-on-surface font-mono">{comparison.behindCount}</span>
                </div>
              </div>
            </div>

            <div className={cn(ui.panelInset, 'p-3 flex items-center gap-2 text-code-sm text-on-surface-variant')}>
              <FileText className="w-4 h-4 text-tertiary-fixed-dim shrink-0" />
              <span className="font-mono truncate">{comparison.diffSummary}</span>
            </div>

            <div>
              <span className={cn(ui.labelCaps, 'block mb-2')}>
                Commits en {targetBranch} ({comparison.commits.length})
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {comparison.commits.map((c) => (
                  <div
                    key={c.hash}
                    className={cn(ui.panelInset, 'p-2 flex items-center justify-between gap-2 text-code-sm')}
                  >
                    <div className="truncate min-w-0">
                      <span className="font-medium text-on-surface block truncate">{c.message}</span>
                      <span className="text-on-surface-variant/70">{c.authorName}</span>
                    </div>
                    <span className="font-mono text-primary shrink-0">{c.shortHash}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-outline-variant bg-surface-container px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <label className="flex items-center gap-2 text-code-sm text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            checked={noFf}
            onChange={(e) => setNoFf(e.target.checked)}
            className="rounded bg-surface-container-high border-outline-variant text-primary focus:ring-0"
          />
          <span>Forzar commit de merge (--no-ff)</span>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-code-sm text-on-surface-variant hover:text-on-surface rounded transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={fusionar}
            disabled={!comparison || comparison.aheadCount === 0 || loading}
            className={cn(ui.btnPrimario, 'bg-tertiary-container text-on-tertiary-container border border-tertiary-fixed-dim/30')}
          >
            <Merge className="w-4 h-4" />
            Fusionar en {baseBranch}
          </button>
        </div>
      </div>
    </ModalCapa>
  );
};

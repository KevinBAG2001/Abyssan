import React, { useState, useEffect } from 'react';
import { GitBranch, GitBranchComparison } from '../types/git';
import { GitCompare, ArrowRight, Merge, X, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { ModalCapa } from './ui/modal-capa';

interface BranchCompareModalProps {
  repoPath: string;
  branches: GitBranch[];
  currentBranch: string;
  loading: boolean;
  onMerge: (sourceBranch: string, noFf: boolean) => void;
  onClose: () => void;
}

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

  return (
    <ModalCapa ancho="compare" onCerrar={onClose} labelledBy="titulo-compare" className="bg-surface-container select-none max-h-[85vh] flex flex-col">
        {/* Encabezado */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-tertiary-fixed-dim" />
            <h3 id="titulo-compare" className="text-headline-sm text-on-surface">Comparar y fusionar ramas</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selectores de Ramas */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/50 flex items-center justify-between space-x-3">
          {/* Rama Base (Destino) */}
          <div className="flex-1">
            <label htmlFor="rama-base" className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Rama Base (Destino de fusion)
            </label>
            <select
              id="rama-base"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-tertiary-fixed-dim"
            >
              {branches.map((b) => (
                <option key={`base-${b.name}`} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 text-on-surface-variant/70">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Rama Target (Origen) */}
          <div className="flex-1">
            <label htmlFor="rama-origen" className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Rama a Comparar / Fusionar (Origen)
            </label>
            <select
              id="rama-origen"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-tertiary-fixed-dim"
            >
              {branches.map((b) => (
                <option key={`target-${b.name}`} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados de la Comparacion */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comparing ? (
            <div className="text-center py-10 text-xs text-on-surface-variant">Analizando diferencias entre ramas...</div>
          ) : !comparison ? (
            <div className="text-center py-10 text-xs text-on-surface-variant/70 italic">
              Selecciona dos ramas diferentes para ver el resumen de cambios
            </div>
          ) : (
            <>
              {/* Estadisticas Ahead/Behind */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-low border border-outline-variant p-3 rounded-lg flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-primary-container/10 text-primary">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Commits por delante (Ahead)
                    </span>
                    <span className="text-lg font-bold text-on-surface">{comparison.aheadCount}</span>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant p-3 rounded-lg flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-secondary-container/10 text-secondary">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Commits por detras (Behind)
                    </span>
                    <span className="text-lg font-bold text-on-surface">{comparison.behindCount}</span>
                  </div>
                </div>
              </div>

              {/* Resumen de Archivos */}
              <div className="bg-surface-container-low border border-outline-variant p-3 rounded-lg flex items-center space-x-2 text-xs text-on-surface-variant">
                <FileText className="w-4 h-4 text-tertiary-fixed-dim shrink-0" />
                <span className="font-mono">{comparison.diffSummary}</span>
              </div>

              {/* Lista de Commits de la Rama */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                  Commits en {targetBranch} ({comparison.commits.length})
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {comparison.commits.map((c) => (
                    <div
                      key={c.hash}
                      className="bg-surface-container border border-outline-variant p-2 rounded flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-on-surface">{c.message}</span>
                        <span className="text-[10px] text-on-surface-variant/70 block">{c.authorName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-primary shrink-0">{c.shortHash}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con Accion de Merge */}
        <div className="p-4 border-t border-outline-variant bg-surface-container flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={noFf}
              onChange={(e) => setNoFf(e.target.checked)}
              className="rounded bg-surface-container-high border-outline-variant text-primary focus:ring-0"
            />
            <span>Forzar commit de merge (--no-ff)</span>
          </label>

          <button
            onClick={() => {
              if (confirm(`Austria: Deseas fusionar la rama "${targetBranch}" en "${baseBranch}"?`)) {
                onMerge(targetBranch, noFf);
                onClose();
              }
            }}
            disabled={!comparison || comparison.aheadCount === 0 || loading}
            className="flex items-center space-x-1.5 px-4 py-2 bg-tertiary-container hover:brightness-110 active:brightness-95 text-on-surface font-bold text-xs rounded-lg shadow-lg shadow-tertiary-fixed-dim/20 transition-colors disabled:opacity-50"
          >
            <Merge className="w-4 h-4" />
            <span>Fusionar en {baseBranch}</span>
          </button>
        </div>
    </ModalCapa>
  );
};

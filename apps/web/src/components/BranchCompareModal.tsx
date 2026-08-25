import React, { useState, useEffect } from 'react';
import { GitBranch, GitBranchComparison } from '../types/git';
import { GitCompare, ArrowRight, Merge, X, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';

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
    branches.find((b) => b.name !== currentBranch)?.name || currentBranch
  );
  const [comparison, setComparison] = useState<GitBranchComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [noFf, setNoFf] = useState(false);

  const fetchComparison = async () => {
    if (!baseBranch || !targetBranch || baseBranch === targetBranch) {
      setComparison(null);
      return;
    }
    setComparing(true);
    try {
      const data = await httpGitApi.compareBranches(repoPath, baseBranch, targetBranch);
      setComparison(data);
    } catch {
      setComparison(null);
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [baseBranch, targetBranch]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#181c2d] border border-[#2e354e] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Encabezado */}
        <div className="p-4 border-b border-[#23283b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Comparador de Ramas & Fusion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selectores de Ramas */}
        <div className="p-4 border-b border-[#23283b] bg-[#141724]/50 flex items-center justify-between space-x-3">
          {/* Rama Base (Destino) */}
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Rama Base (Destino de fusion)
            </label>
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {branches.map((b) => (
                <option key={`base-${b.name}`} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 text-slate-500">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Rama Target (Origen) */}
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Rama a Comparar / Fusionar (Origen)
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
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
            <div className="text-center py-10 text-xs text-slate-400">Analizando diferencias entre ramas...</div>
          ) : !comparison ? (
            <div className="text-center py-10 text-xs text-slate-500 italic">
              Selecciona dos ramas diferentes para ver el resumen de cambios
            </div>
          ) : (
            <>
              {/* Estadisticas Ahead/Behind */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141724] border border-[#23283b] p-3 rounded-lg flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Commits por delante (Ahead)
                    </span>
                    <span className="text-lg font-bold text-white">{comparison.aheadCount}</span>
                  </div>
                </div>

                <div className="bg-[#141724] border border-[#23283b] p-3 rounded-lg flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-sky-500/10 text-sky-400">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Commits por detras (Behind)
                    </span>
                    <span className="text-lg font-bold text-white">{comparison.behindCount}</span>
                  </div>
                </div>
              </div>

              {/* Resumen de Archivos */}
              <div className="bg-[#141724] border border-[#23283b] p-3 rounded-lg flex items-center space-x-2 text-xs text-slate-300">
                <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-mono">{comparison.diffSummary}</span>
              </div>

              {/* Lista de Commits de la Rama */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Commits en {targetBranch} ({comparison.commits.length})
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {comparison.commits.map((c) => (
                    <div
                      key={c.hash}
                      className="bg-[#10131e] border border-[#23283b] p-2 rounded flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-200">{c.message}</span>
                        <span className="text-[10px] text-slate-500 block">{c.authorName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400 shrink-0">{c.shortHash}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con Accion de Merge */}
        <div className="p-4 border-t border-[#23283b] bg-[#10131e] flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={noFf}
              onChange={(e) => setNoFf(e.target.checked)}
              className="rounded bg-[#1b1f30] border-[#2e354e] text-emerald-500 focus:ring-0"
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
            className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            <Merge className="w-4 h-4" />
            <span>Fusionar en {baseBranch}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

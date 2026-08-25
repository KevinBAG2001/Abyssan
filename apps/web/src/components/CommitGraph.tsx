import React, { useMemo, useState } from 'react';
import { GitCommit } from '../types/git';
import { Tag, GitBranch, Search, X } from 'lucide-react';

interface CommitGraphProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
}

const BRANCH_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
];

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedCommit,
  onSelectCommit,
  onContextMenu,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // Filtramos commits segun el termino de busqueda
  const filteredCommits = useMemo(() => {
    if (!searchTerm.trim()) return commits;
    const term = searchTerm.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(term) ||
        c.authorName.toLowerCase().includes(term) ||
        c.hash.toLowerCase().includes(term) ||
        c.shortHash.toLowerCase().includes(term) ||
        c.branches?.some((b) => b.toLowerCase().includes(term)) ||
        c.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }, [commits, searchTerm]);

  // Algoritmo de asignacion de columnas y colores para ramas del grafo DAG
  const processedGraph = useMemo(() => {
    const branchColumnMap: { [hash: string]: number } = {};
    const columnColors: { [col: number]: string } = {};
    let nextCol = 0;

    return filteredCommits.map((commit) => {
      let col = branchColumnMap[commit.hash];
      if (col === undefined) {
        col = nextCol % BRANCH_COLORS.length;
        branchColumnMap[commit.hash] = col;
        columnColors[col] = BRANCH_COLORS[col % BRANCH_COLORS.length];
        nextCol++;
      }

      if (commit.parents && commit.parents.length > 0) {
        const primaryParent = commit.parents[0];
        if (branchColumnMap[primaryParent] === undefined) {
          branchColumnMap[primaryParent] = col;
        }
        if (commit.parents.length > 1) {
          const secondary = commit.parents[1];
          if (branchColumnMap[secondary] === undefined) {
            const colSec = (col + 1) % BRANCH_COLORS.length;
            branchColumnMap[secondary] = colSec;
            columnColors[colSec] = BRANCH_COLORS[colSec];
          }
        }
      }

      return {
        ...commit,
        column: col,
        color: columnColors[col] || BRANCH_COLORS[0],
      };
    });
  }, [filteredCommits]);

  const ROW_HEIGHT = 44;
  const COL_WIDTH = 22;
  const GRAPH_OFFSET_X = 22;

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sync = () => setViewportH(el.clientHeight);
    sync();
    const obs = new ResizeObserver(sync);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f111a] overflow-hidden">
      {/* Barra de Busqueda y Filtros de Commits */}
      <div className="h-10 bg-[#141724] border-b border-[#23283b] px-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por mensaje, autor, hash o rama..."
              className="w-full bg-[#1b1f30] border border-[#2e354e] rounded-md pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span>
            {filteredCommits.length} de {commits.length} commits
          </span>
        </div>
      </div>

      {/* Encabezado de Columnas */}
      <div className="h-8 bg-[#10131e] border-b border-[#23283b] px-4 flex items-center text-[11px] font-semibold text-slate-400 select-none">
        <div className="w-[180px] shrink-0">Grafo / Ramas</div>
        <div className="flex-1 truncate">Mensaje de Commit</div>
        <div className="w-36 shrink-0 hidden md:block">Autor</div>
        <div className="w-28 shrink-0 hidden lg:block">Fecha</div>
        <div className="w-20 shrink-0 text-right font-mono">Hash</div>
      </div>

      {/* Cuerpo del Grafo (filas virtualizadas) */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {processedGraph.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-500">
            {searchTerm
              ? `No se encontraron commits que coincidan con "${searchTerm}".`
              : 'No se encontraron commits en este repositorio o el repositorio esta vacio.'}
          </div>
        ) : (
          <GrafoVirtualizado
            processedGraph={processedGraph}
            selectedCommit={selectedCommit}
            onSelectCommit={onSelectCommit}
            onContextMenu={onContextMenu}
            scrollTop={scrollTop}
            viewportH={viewportH}
            ROW_HEIGHT={ROW_HEIGHT}
            COL_WIDTH={COL_WIDTH}
            GRAPH_OFFSET_X={GRAPH_OFFSET_X}
          />
        )}
      </div>
    </div>
  );
};

type CommitGrafo = GitCommit & { column?: number; color?: string };

function GrafoVirtualizado({
  processedGraph,
  selectedCommit,
  onSelectCommit,
  onContextMenu,
  scrollTop,
  viewportH,
  ROW_HEIGHT,
  COL_WIDTH,
  GRAPH_OFFSET_X,
}: {
  processedGraph: CommitGrafo[];
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
  scrollTop: number;
  viewportH: number;
  ROW_HEIGHT: number;
  COL_WIDTH: number;
  GRAPH_OFFSET_X: number;
}) {
  const overscan = 12;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const visible = Math.ceil(viewportH / ROW_HEIGHT) + overscan * 2;
  const end = Math.min(processedGraph.length, start + visible);
  const slice = processedGraph.slice(start, end);
  const indicePorHash = React.useMemo(() => {
    const m = new Map<string, number>();
    processedGraph.forEach((c, i) => m.set(c.hash, i));
    return m;
  }, [processedGraph]);

  return (
    <div className="relative min-w-full" style={{ height: `${processedGraph.length * ROW_HEIGHT}px` }}>
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: `${GRAPH_OFFSET_X + 12 * COL_WIDTH}px`,
          height: `${processedGraph.length * ROW_HEIGHT}px`,
        }}
      >
        {slice.map((commit, localIdx) => {
          const index = start + localIdx;
          const x1 = GRAPH_OFFSET_X + (commit.column || 0) * COL_WIDTH;
          const y1 = index * ROW_HEIGHT + ROW_HEIGHT / 2;
          return commit.parents.map((parentHash) => {
            const parentIndex = indicePorHash.get(parentHash);
            if (parentIndex === undefined) return null;
            const parentCommit = processedGraph[parentIndex];
            const x2 = GRAPH_OFFSET_X + (parentCommit.column || 0) * COL_WIDTH;
            const y2 = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            const path = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
            return (
              <path
                key={`${commit.hash}-${parentHash}`}
                d={path}
                fill="none"
                stroke={commit.color || '#10b981'}
                strokeWidth="2.5"
                strokeOpacity="0.8"
              />
            );
          });
        })}
      </svg>

      {slice.map((commit, localIdx) => {
        const index = start + localIdx;
        const isSelected = selectedCommit?.hash === commit.hash;
        const nodeX = GRAPH_OFFSET_X + (commit.column || 0) * COL_WIDTH;
        return (
          <div
            key={commit.hash}
            onClick={() => onSelectCommit(commit)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(commit, { x: e.clientX, y: e.clientY });
            }}
            style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
            className={`absolute left-0 right-0 px-4 flex items-center text-xs cursor-pointer border-b border-white/[0.03] ${
              isSelected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                : 'hover:bg-[#161a29] text-slate-300'
            }`}
          >
            <div className="w-[180px] shrink-0 relative h-full flex items-center">
              <div
                className="absolute w-3.5 h-3.5 rounded-full border-2 border-[#0f111a] transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${nodeX}px`,
                  top: `${ROW_HEIGHT / 2}px`,
                  backgroundColor: commit.color,
                }}
              />
            </div>
            <div className="flex-1 flex items-center space-x-2 truncate pr-4">
              {commit.branches?.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0"
                >
                  <GitBranch className="w-2.5 h-2.5" />
                  <span>{b}</span>
                </span>
              ))}
              {commit.tags?.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{t}</span>
                </span>
              ))}
              <span className="truncate font-medium text-slate-200">{commit.message}</span>
            </div>
            <div className="w-36 shrink-0 hidden md:flex items-center space-x-1.5 text-slate-400 truncate">
              <div className="w-4 h-4 rounded-full bg-[#23283b] flex items-center justify-center text-[9px] font-bold text-slate-300">
                {commit.authorName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{commit.authorName}</span>
            </div>
            <div className="w-28 shrink-0 hidden lg:block text-slate-400 text-[11px]">
              {new Date(commit.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="w-20 shrink-0 text-right font-mono text-[11px] text-slate-400">{commit.shortHash}</div>
          </div>
        );
      })}
    </div>
  );
}

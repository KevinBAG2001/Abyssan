import React, { useMemo, useState } from 'react';
import { GitCommit } from '../types/git';
import { Search, X } from 'lucide-react';
import { COLORES_RAMA_GRAFO, COLOR_RAMA_DEFECTO } from '../lib/tokens-grafo';
import { ChipRama } from './ui/chip-rama';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { GitBranch } from 'lucide-react';

interface CommitGraphProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  currentBranch?: string;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedCommit,
  currentBranch,
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
        col = nextCol % COLORES_RAMA_GRAFO.length;
        branchColumnMap[commit.hash] = col;
        columnColors[col] = COLORES_RAMA_GRAFO[col % COLORES_RAMA_GRAFO.length];
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
            const colSec = (col + 1) % COLORES_RAMA_GRAFO.length;
            branchColumnMap[secondary] = colSec;
            columnColors[colSec] = COLORES_RAMA_GRAFO[colSec];
          }
        }
      }

      return {
        ...commit,
        column: col,
        color: columnColors[col] || COLOR_RAMA_DEFECTO,
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

  const ramasVisibles = useMemo(() => {
    const set = new Set<string>();
    if (currentBranch) set.add(currentBranch);
    for (const c of commits.slice(0, 12)) {
      c.branches?.forEach((b) => set.add(b));
      if (set.size >= 4) break;
    }
    return [...set].slice(0, 4);
  }, [commits, currentBranch]);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden min-w-0">
      <div className="h-10 bg-surface-container-low border-b border-outline-variant px-4 flex items-center justify-between select-none shrink-0 gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink">
          <GitBranch className="w-4 h-4 text-ion shrink-0" />
          <span className={ui.labelCaps}>Commit Graph</span>
          <div className="hidden sm:flex items-center gap-1 min-w-0 overflow-hidden">
            {ramasVisibles.map((r) => (
              <ChipRama key={r} nombre={r} tipo="rama" />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end min-w-0 max-w-md">
          <div className="relative w-full min-w-[8rem]">
            <label htmlFor="busqueda-commits" className="sr-only">
              Buscar commits
            </label>
            <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="busqueda-commits"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mensaje, autor, hash o rama…"
              className="w-full bg-surface-container-high border border-outline-variant rounded pl-8 pr-7 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary min-w-0 font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="text-code-sm text-on-surface-variant font-mono shrink-0 hidden md:block">
            <span>
              {filteredCommits.length}/{commits.length}
            </span>
          </div>
        </div>
      </div>

      {/* Encabezado de Columnas */}
      <div className="h-8 bg-surface-container border-b border-outline-variant px-4 flex items-center text-label-caps text-on-surface-variant select-none shrink-0 min-w-0">
        <div className="w-[140px] sm:w-[180px] shrink-0">Grafo / Ramas</div>
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
          <div className="flex items-center justify-center h-full text-xs text-on-surface-variant/70">
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
                stroke={commit.color || COLOR_RAMA_DEFECTO}
                strokeWidth="2.5"
                strokeOpacity="0.8"
              />
            );
          });
        })}
      </svg>

      {slice.map((commit, localIdx) => {
        const index = start + localIdx;
        const isHead = index === 0;
        const isSelected = selectedCommit?.hash === commit.hash;
        const nodeX = GRAPH_OFFSET_X + (commit.column || 0) * COL_WIDTH;
        return (
          <button
            type="button"
            key={commit.hash}
            onClick={() => onSelectCommit(commit)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(commit, { x: e.clientX, y: e.clientY });
            }}
            style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
            className={cn(
              'absolute left-0 right-0 px-4 flex items-center text-label-md cursor-pointer border-b border-outline-variant/30 text-left w-full',
              isSelected
                ? 'bg-primary-container/10 border-l-2 border-l-primary text-on-surface glow-biolume-sm'
                : isHead
                  ? 'bg-ion/5 border-l-2 border-l-ion/40 text-on-surface'
                  : 'hover:bg-surface-container-high/40 text-on-surface-variant'
            )}
          >
            <div className="w-[140px] sm:w-[180px] shrink-0 relative h-full flex items-center">
              <div
                className={cn(
                  'absolute w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest transform -translate-x-1/2 -translate-y-1/2',
                  isHead && 'glow-biolume-sm ring-2 ring-ion/30'
                )}
                style={{
                  left: `${nodeX}px`,
                  top: `${ROW_HEIGHT / 2}px`,
                  backgroundColor: commit.color,
                }}
              />
            </div>
            <div className="flex-1 flex items-center gap-1.5 truncate pr-4 min-w-0">
              {commit.branches?.map((b) => (
                <ChipRama key={b} nombre={b} tipo="rama" />
              ))}
              {commit.tags?.map((t) => (
                <ChipRama key={t} nombre={t} tipo="tag" />
              ))}
              <span className="truncate font-medium text-on-surface">{commit.message}</span>
            </div>
            <div className="w-36 shrink-0 hidden md:flex items-center space-x-1.5 text-on-surface-variant truncate">
              <div className="w-4 h-4 rounded-full bg-surface-container-highest flex items-center justify-center text-[9px] font-bold text-on-surface-variant">
                {commit.authorName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{commit.authorName}</span>
            </div>
            <div className="w-28 shrink-0 hidden lg:block text-on-surface-variant text-[11px]">
              {new Date(commit.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="w-20 shrink-0 text-right font-mono text-[11px] text-on-surface-variant">{commit.shortHash}</div>
          </button>
        );
      })}
    </div>
  );
}

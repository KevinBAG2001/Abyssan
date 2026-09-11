// Austria: Grafo de commits — Fase 4.4 Grafo excepcional
import React, { useMemo, useState, useCallback } from 'react';
import { GitCommit } from '../types/git';
import {
  Search, X, GitBranch, User, Route, Waypoints,
  ArrowDownUp, Minus, Plus, ChevronDown,
} from 'lucide-react';
import { COLORES_RAMA_GRAFO, COLOR_RAMA_DEFECTO } from '../lib/tokens-grafo';
import { ChipRama } from './ui/chip-rama';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import {
  obtenerAncestros,
  obtenerDescendientes,
  encontrarCamino,
  autoresUnicos,
  ramasUnicas,
} from '../lib/grafo-utils';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';

// --- Tipos internos ---

type ModoResaltado =
  | { tipo: 'ninguno' }
  | { tipo: 'autor'; autor: string }
  | { tipo: 'rama'; rama: string }
  | { tipo: 'ancestros' }
  | { tipo: 'descendientes' }
  | { tipo: 'camino'; hashB: string; mergeBase: string | null }
  | { tipo: 'explicacionRama'; rama: string; mergeBase: string | null };

type Densidad = 'compacta' | 'normal' | 'amplia';
const ALTURAS: Record<Densidad, number> = { compacta: 32, normal: 44, amplia: 56 };
const CLAVE_DENSIDAD = 'abyssan.densidadGrafo';

function leerDensidad(): Densidad {
  if (typeof window === 'undefined') return 'normal';
  const v = localStorage.getItem(CLAVE_DENSIDAD);
  if (v === 'compacta' || v === 'amplia') return v;
  return 'normal';
}

// --- Props del componente (compatibles con las existentes) ---

interface CommitGraphProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  currentBranch?: string;
  selectedRepo?: string | null;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
}

// --- Componente principal ---

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedCommit,
  currentBranch,
  selectedRepo,
  onSelectCommit,
  onContextMenu,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const [modo, setModo] = useState<ModoResaltado>({ tipo: 'ninguno' });
  const [commitB, setCommitB] = useState<string | null>(null);
  const [densidad, setDensidad] = useState<Densidad>(leerDensidad);
  const [filtroAbierto, setFiltroAbierto] = useState(false);

  const ROW_HEIGHT = ALTURAS[densidad];
  const COL_WIDTH = 22;
  const GRAPH_OFFSET_X = 22;

  // Listas para filtros
  const autores = useMemo(() => autoresUnicos(commits), [commits]);
  const ramas = useMemo(() => ramasUnicas(commits), [commits]);

  // Búsqueda textual (NO filtra, solo marca)
  const hashesCoincidentes = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const set = new Set<string>();
    for (const c of commits) {
      if (
        c.message.toLowerCase().includes(term) ||
        c.authorName.toLowerCase().includes(term) ||
        c.hash.toLowerCase().includes(term) ||
        c.shortHash.toLowerCase().includes(term) ||
        c.branches?.some((b) => b.toLowerCase().includes(term)) ||
        c.tags?.some((t) => t.toLowerCase().includes(term))
      ) {
        set.add(c.hash);
      }
    }
    return set;
  }, [commits, searchTerm]);

  // Set de commits resaltados por el modo activo
  const resaltados = useMemo<Set<string> | null>(() => {
    if (!selectedCommit && modo.tipo !== 'explicacionRama' && modo.tipo !== 'autor' && modo.tipo !== 'rama') {
      return null;
    }

    switch (modo.tipo) {
      case 'ninguno':
        return null;
      case 'autor': {
        const set = new Set<string>();
        for (const c of commits) {
          if (c.authorName === modo.autor) set.add(c.hash);
        }
        return set;
      }
      case 'rama': {
        const set = new Set<string>();
        for (const c of commits) {
          if (c.branches?.includes(modo.rama)) set.add(c.hash);
        }
        // Si solo encontramos el tip, expandimos a ancestros hasta el merge-base con main
        if (set.size <= 1 && set.size > 0) {
          const tip = [...set][0];
          const ancestros = obtenerAncestros(tip, commits);
          ancestros.add(tip);
          return ancestros;
        }
        return set;
      }
      case 'ancestros': {
        if (!selectedCommit) return null;
        const anc = obtenerAncestros(selectedCommit.hash, commits);
        anc.add(selectedCommit.hash);
        return anc;
      }
      case 'descendientes': {
        if (!selectedCommit) return null;
        const desc = obtenerDescendientes(selectedCommit.hash, commits);
        desc.add(selectedCommit.hash);
        return desc;
      }
      case 'camino': {
        if (!selectedCommit) return null;
        const camino = encontrarCamino(selectedCommit.hash, modo.hashB, commits);
        if (modo.mergeBase) camino.add(modo.mergeBase);
        return camino;
      }
      case 'explicacionRama': {
        // Ilumina commits desde el tip de la rama hasta el merge-base
        const tip = commits.find((c) => c.branches?.includes(modo.rama));
        if (!tip) return null;
        if (modo.mergeBase) {
          const indicePor = new Map<string, GitCommit>();
          for (const c of commits) indicePor.set(c.hash, c);
          const resultado = new Set<string>();
          const cola: string[] = [tip.hash];
          while (cola.length > 0) {
            const actual = cola.pop()!;
            if (resultado.has(actual)) continue;
            resultado.add(actual);
            if (actual === modo.mergeBase) continue;
            const commit = indicePor.get(actual);
            if (commit) {
              for (const p of commit.parents) {
                if (indicePor.has(p) && !resultado.has(p)) cola.push(p);
              }
            }
          }
          return resultado;
        }
        const anc = obtenerAncestros(tip.hash, commits);
        anc.add(tip.hash);
        return anc;
      }
      default:
        return null;
    }
  }, [modo, selectedCommit, commits]);

  // Combinación final de resaltado: búsqueda + modo
  const esResaltado = useCallback(
    (hash: string): boolean | null => {
      // null = sin filtro activo, no atenuar nada
      if (!hashesCoincidentes && !resaltados) return null;
      if (hashesCoincidentes && resaltados) {
        return hashesCoincidentes.has(hash) && resaltados.has(hash);
      }
      if (hashesCoincidentes) return hashesCoincidentes.has(hash);
      if (resaltados) return resaltados.has(hash);
      return null;
    },
    [hashesCoincidentes, resaltados],
  );

  // Asignación de columnas y colores (sin cambios en la lógica del DAG)
  const processedGraph = useMemo(() => {
    const branchColumnMap: Record<string, number> = {};
    const columnColors: Record<number, string> = {};
    let nextCol = 0;

    return commits.map((commit) => {
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
      return { ...commit, column: col, color: columnColors[col] || COLOR_RAMA_DEFECTO };
    });
  }, [commits]);

  // Resize observer
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sync = () => setViewportH(el.clientHeight);
    sync();
    const obs = new ResizeObserver(sync);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Ramas visibles en el header
  const ramasVisibles = useMemo(() => {
    const set = new Set<string>();
    if (currentBranch) set.add(currentBranch);
    for (const c of commits.slice(0, 12)) {
      c.branches?.forEach((b) => set.add(b));
      if (set.size >= 4) break;
    }
    return [...set].slice(0, 4);
  }, [commits, currentBranch]);

  // Handlers de modo
  const activarAncestros = useCallback(() => {
    setModo((prev) => (prev.tipo === 'ancestros' ? { tipo: 'ninguno' } : { tipo: 'ancestros' }));
  }, []);

  const activarDescendientes = useCallback(() => {
    setModo((prev) => (prev.tipo === 'descendientes' ? { tipo: 'ninguno' } : { tipo: 'descendientes' }));
  }, []);

  const iniciarComparar = useCallback(() => {
    if (!selectedCommit) return;
    if (commitB === null) {
      setCommitB(selectedCommit.hash);
    } else {
      // Ya hay B seleccionado, buscar merge-base y activar camino
      const hashA = selectedCommit.hash;
      const hashB = commitB;
      setCommitB(null);
      if (selectedRepo) {
        void httpGitApi.mergeBase(selectedRepo, hashA, hashB).then((mb) => {
          setModo({ tipo: 'camino', hashB, mergeBase: mb });
        });
      } else {
        setModo({ tipo: 'camino', hashB, mergeBase: null });
      }
    }
  }, [selectedCommit, commitB, selectedRepo]);

  const activarExplicacionRama = useCallback(
    (rama: string) => {
      const tip = commits.find((c) => c.branches?.includes(rama));
      if (!tip || !selectedRepo || !currentBranch) {
        setModo({ tipo: 'explicacionRama', rama, mergeBase: null });
        return;
      }
      void httpGitApi.mergeBase(selectedRepo, rama, currentBranch).then((mb) => {
        setModo({ tipo: 'explicacionRama', rama, mergeBase: mb });
      });
    },
    [commits, selectedRepo, currentBranch],
  );

  const cambiarDensidad = useCallback((d: Densidad) => {
    setDensidad(d);
    localStorage.setItem(CLAVE_DENSIDAD, d);
  }, []);

  const limpiarModo = useCallback(() => {
    setModo({ tipo: 'ninguno' });
    setCommitB(null);
  }, []);

  // Info de modo activo para el badge
  const badgeModo = useMemo(() => {
    switch (modo.tipo) {
      case 'ancestros': return 'Ancestros';
      case 'descendientes': return 'Descendientes';
      case 'camino': return 'Camino';
      case 'autor': return `Autor: ${modo.autor}`;
      case 'rama': return `Rama: ${modo.rama}`;
      case 'explicacionRama': return `Rama: ${modo.rama}`;
      default: return null;
    }
  }, [modo]);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden min-w-0">
      {/* Barra superior */}
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

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0 max-w-lg">
          {/* Búsqueda */}
          <div className="relative w-full min-w-[8rem] max-w-xs">
            <label htmlFor="busqueda-commits" className="sr-only">Buscar commits</label>
            <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="busqueda-commits"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mensaje, autor, hash…"
              className="w-full bg-surface-container-high border border-outline-variant rounded pl-8 pr-7 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary min-w-0 font-mono"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" aria-label="Limpiar búsqueda">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Conteo */}
          <span className="text-code-sm text-on-surface-variant font-mono shrink-0 hidden md:block">
            {hashesCoincidentes ? `${hashesCoincidentes.size}/` : ''}{commits.length}
          </span>

          {/* Botón filtros */}
          <button
            type="button"
            onClick={() => setFiltroAbierto((v) => !v)}
            className={cn(ui.btnIcono, filtroAbierto && 'ring-1 ring-primary bg-primary/10')}
            title="Filtros y resaltado"
            aria-label="Abrir filtros"
            aria-expanded={filtroAbierto}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtroAbierto && 'rotate-180')} />
          </button>

          {/* Densidad */}
          <div className="flex items-center border border-outline-variant rounded shrink-0">
            <button type="button" onClick={() => cambiarDensidad('compacta')} className={cn('p-1 transition-colors', densidad === 'compacta' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Compacto" aria-label="Densidad compacta">
              <Minus className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => cambiarDensidad('normal')} className={cn('p-1 transition-colors', densidad === 'normal' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Normal" aria-label="Densidad normal">
              <ArrowDownUp className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => cambiarDensidad('amplia')} className={cn('p-1 transition-colors', densidad === 'amplia' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Amplio" aria-label="Densidad amplia">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de filtros (colapsable) */}
      {filtroAbierto && (
        <div className="bg-surface-container border-b border-outline-variant px-4 py-2 flex flex-wrap items-center gap-2 text-code-sm shrink-0 select-none">
          {/* Filtro autor */}
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-on-surface-variant" />
            <select
              value={modo.tipo === 'autor' ? modo.autor : ''}
              onChange={(e) => {
                const v = e.target.value;
                setModo(v ? { tipo: 'autor', autor: v } : { tipo: 'ninguno' });
              }}
              className="bg-surface-container-high border border-outline-variant rounded px-2 py-0.5 text-code-sm text-on-surface focus:outline-none focus:border-primary font-mono max-w-[10rem]"
            >
              <option value="">Todos los autores</option>
              {autores.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Filtro rama */}
          <div className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-on-surface-variant" />
            <select
              value={modo.tipo === 'rama' ? modo.rama : modo.tipo === 'explicacionRama' ? modo.rama : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) { setModo({ tipo: 'ninguno' }); return; }
                activarExplicacionRama(v);
              }}
              className="bg-surface-container-high border border-outline-variant rounded px-2 py-0.5 text-code-sm text-on-surface focus:outline-none focus:border-primary font-mono max-w-[12rem]"
            >
              <option value="">Todas las ramas</option>
              {ramas.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="h-4 w-px bg-outline-variant" />

          {/* Ancestros / Descendientes */}
          <button
            type="button"
            disabled={!selectedCommit}
            onClick={activarAncestros}
            className={cn(ui.btnIcono, 'text-code-sm gap-1', modo.tipo === 'ancestros' && 'ring-1 ring-secondary bg-secondary/10')}
            title={selectedCommit ? 'Resaltar ancestros' : 'Selecciona un commit primero'}
          >
            <Waypoints className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ancestros</span>
          </button>

          <button
            type="button"
            disabled={!selectedCommit}
            onClick={activarDescendientes}
            className={cn(ui.btnIcono, 'text-code-sm gap-1', modo.tipo === 'descendientes' && 'ring-1 ring-secondary bg-secondary/10')}
            title={selectedCommit ? 'Resaltar descendientes' : 'Selecciona un commit primero'}
          >
            <Waypoints className="w-3.5 h-3.5 rotate-180" />
            <span className="hidden lg:inline">Descendientes</span>
          </button>

          {/* Comparar A ↔ B */}
          <button
            type="button"
            disabled={!selectedCommit}
            onClick={iniciarComparar}
            className={cn(
              ui.btnIcono, 'text-code-sm gap-1',
              commitB && 'ring-1 ring-primary bg-primary/10',
              modo.tipo === 'camino' && 'ring-1 ring-primary bg-primary/10',
            )}
            title={commitB ? `Commit A: ${commitB.substring(0, 7)} — selecciona el segundo commit y pulsa de nuevo` : 'Comparar dos commits (selecciona A, luego B)'}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{commitB ? `A: ${commitB.substring(0, 7)}…` : 'Comparar'}</span>
          </button>

          {/* Badge de modo activo */}
          {badgeModo && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-tertiary-fixed-dim/15 border border-tertiary-fixed-dim/30 rounded text-code-sm text-tertiary-fixed-dim">
              {badgeModo}
              <button type="button" onClick={limpiarModo} className="hover:text-on-surface" aria-label="Quitar filtro">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Encabezado columnas */}
      <div className="h-8 bg-surface-container border-b border-outline-variant px-4 flex items-center text-label-caps text-on-surface-variant select-none shrink-0 min-w-0">
        <div className="w-[140px] sm:w-[180px] shrink-0">Grafo / Ramas</div>
        <div className="flex-1 truncate">Mensaje de Commit</div>
        <div className="w-36 shrink-0 hidden md:block">Autor</div>
        <div className="w-28 shrink-0 hidden lg:block">Fecha</div>
        <div className="w-20 shrink-0 text-right font-mono">Hash</div>
      </div>

      {/* Cuerpo virtualizado con scroll horizontal en el grafo */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative"
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
            commitB={commitB}
            onSelectCommit={onSelectCommit}
            onContextMenu={onContextMenu}
            esResaltado={esResaltado}
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

// --- Componente virtualizado ---

type CommitGrafo = GitCommit & { column?: number; color?: string };

function GrafoVirtualizado({
  processedGraph,
  selectedCommit,
  commitB,
  onSelectCommit,
  onContextMenu,
  esResaltado,
  scrollTop,
  viewportH,
  ROW_HEIGHT,
  COL_WIDTH,
  GRAPH_OFFSET_X,
}: {
  processedGraph: CommitGrafo[];
  selectedCommit: GitCommit | null;
  commitB: string | null;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
  esResaltado: (hash: string) => boolean | null;
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

  // Calcular ancho máximo del grafo para scroll horizontal
  const maxCol = useMemo(() => {
    let max = 0;
    for (const c of processedGraph) {
      if ((c.column ?? 0) > max) max = c.column ?? 0;
    }
    return max;
  }, [processedGraph]);

  const graphWidth = GRAPH_OFFSET_X + (maxCol + 2) * COL_WIDTH;

  return (
    <div className="relative" style={{ height: `${processedGraph.length * ROW_HEIGHT}px`, minWidth: `${Math.max(graphWidth + 500, 800)}px` }}>
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: `${graphWidth}px`, height: `${processedGraph.length * ROW_HEIGHT}px` }}
      >
        {slice.map((commit, localIdx) => {
          const index = start + localIdx;
          const x1 = GRAPH_OFFSET_X + (commit.column || 0) * COL_WIDTH;
          const y1 = index * ROW_HEIGHT + ROW_HEIGHT / 2;
          const highlight = esResaltado(commit.hash);
          const opacidadLinea = highlight === false ? 0.15 : 0.8;

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
                strokeOpacity={opacidadLinea}
              />
            );
          });
        })}
      </svg>

      {slice.map((commit, localIdx) => {
        const index = start + localIdx;
        const isHead = index === 0;
        const isSelected = selectedCommit?.hash === commit.hash;
        const isCompareB = commitB === commit.hash;
        const highlight = esResaltado(commit.hash);
        const atenuado = highlight === false;
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
              'absolute left-0 right-0 px-4 flex items-center text-label-md cursor-pointer border-b border-outline-variant/30 text-left w-full transition-opacity',
              isSelected
                ? 'bg-primary-container/10 border-l-2 border-l-primary text-on-surface glow-biolume-sm'
                : isCompareB
                  ? 'bg-secondary/10 border-l-2 border-l-secondary text-on-surface'
                  : isHead
                    ? 'bg-ion/5 border-l-2 border-l-ion/40 text-on-surface'
                    : 'hover:bg-surface-container-high/40 text-on-surface-variant',
              atenuado && 'opacity-25',
            )}
          >
            <div className="w-[140px] sm:w-[180px] shrink-0 relative h-full flex items-center">
              <div
                className={cn(
                  'absolute w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest transform -translate-x-1/2 -translate-y-1/2',
                  isHead && 'glow-biolume-sm ring-2 ring-ion/30',
                  isCompareB && 'ring-2 ring-secondary/60',
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

// Austria: Grafo de commits — renderer SVG virtualizado (bloque G).
// El pan es el scroll. No hay zoom: la altura de fila fija es la que permite virtualizar.
// Lanes y semántica viven en funciones puras; aquí solo se pintan.
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { GitCommit } from '../types/git';
import { ChipRama } from './ui/chip-rama';
import { cn } from '../lib/utils';
import {
  aristasQueCruzanVentana,
  asignarLanes,
  commitsDeLaRama,
  esRefRemota,
  obtenerAncestros,
  obtenerDescendientes,
  encontrarCamino,
  autoresUnicos,
  ramasUnicas,
  type CommitConLane,
} from '../lib/grafo-utils';
import {
  estiloAristaSemantica,
  familiaDeCommit,
  INTELIGENCIA_GRAFO_VACIA,
  marcasDeCommit,
  relacionConHead,
  resolverSemanticaGrafo,
  textoMarcas,
  mismaRef,
  type InteligenciaGrafo,
  type MarcasCommit,
} from '../lib/semantica-grafo';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { BarraSuperiorGrafo } from './grafo/BarraSuperiorGrafo';
import { BarraFiltrosGrafo } from './grafo/BarraFiltrosGrafo';
import { BarraSemanticaGrafo } from './grafo/BarraSemanticaGrafo';
import { FichaCommitSeleccionado } from './grafo/FichaCommitSeleccionado';

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
const REMOTOS_VACIOS: string[] = [];

function leerDensidad(): Densidad {
  if (typeof window === 'undefined') return 'normal';
  const v = localStorage.getItem(CLAVE_DENSIDAD);
  if (v === 'compacta' || v === 'amplia') return v;
  return 'normal';
}

function etiquetaModo(modo: ModoResaltado): string | null {
  switch (modo.tipo) {
    case 'ancestros':
      return 'Ancestros';
    case 'descendientes':
      return 'Descendientes';
    case 'camino':
      return 'Camino';
    case 'autor':
      return `Autor: ${modo.autor}`;
    case 'rama':
      return `Rama: ${modo.rama}`;
    case 'explicacionRama':
      return `Rama: ${modo.rama}`;
    default:
      return null;
  }
}

function useAccionesGrafo({
  commits,
  processedGraph,
  selectedCommit,
  selectedRepo,
  currentBranch,
  commitB,
  modo,
  onSelectCommit,
  rowHeight,
  scrollerRef,
  enfocarTrasTecla,
  setScrollTop,
  setFoco,
  setModo,
  setCommitB,
  setDensidad,
}: {
  commits: GitCommit[];
  processedGraph: CommitConLane[];
  selectedCommit: GitCommit | null;
  selectedRepo?: string | null;
  currentBranch?: string;
  commitB: string | null;
  modo: ModoResaltado;
  onSelectCommit: (commit: GitCommit) => void;
  rowHeight: number;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  enfocarTrasTecla: { current: string | null };
  setScrollTop: React.Dispatch<React.SetStateAction<number>>;
  setFoco: React.Dispatch<React.SetStateAction<GitCommit | null>>;
  setModo: React.Dispatch<React.SetStateAction<ModoResaltado>>;
  setCommitB: React.Dispatch<React.SetStateAction<string | null>>;
  setDensidad: React.Dispatch<React.SetStateAction<Densidad>>;
}) {
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      setScrollTop((prev) => (Math.floor(prev / rowHeight) === Math.floor(top / rowHeight) ? prev : top));
    },
    [rowHeight, setScrollTop],
  );

  const onEnfocar = useCallback((hash: string | null) => {
    setFoco((prev) => {
      if (hash === null) return prev === null ? prev : null;
      if (prev?.hash === hash) return prev;
      return commits.find((c) => c.hash === hash) ?? null;
    });
  }, [commits, setFoco]);

  const seleccionar = useCallback(
    (commit: GitCommit) => {
      onSelectCommit(commit);
    },
    [onSelectCommit],
  );

  const revelar = useCallback(
    (hash: string) => {
      const commit = commits.find((c) => c.hash === hash) ?? processedGraph.find((c) => c.hash === hash);
      if (!commit) return;
      onSelectCommit(commit);
      const idx = processedGraph.findIndex((c) => c.hash === hash);
      const el = scrollerRef.current;
      if (idx < 0 || !el) return;
      const top = idx * rowHeight;
      if (top < el.scrollTop || top + rowHeight > el.scrollTop + el.clientHeight) {
        el.scrollTop = Math.max(0, top - el.clientHeight / 2);
      }
    },
    [commits, processedGraph, onSelectCommit, rowHeight, scrollerRef],
  );

  const onTeclado = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (processedGraph.length === 0) return;
      e.preventDefault();
      const actual = selectedCommit ? processedGraph.findIndex((c) => c.hash === selectedCommit.hash) : -1;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const siguiente = Math.min(processedGraph.length - 1, Math.max(0, actual < 0 ? 0 : actual + delta));
      const commit = processedGraph[siguiente];
      enfocarTrasTecla.current = commit.hash;
      revelar(commit.hash);
    },
    [processedGraph, selectedCommit, revelar, enfocarTrasTecla],
  );

  const activarAncestros = useCallback(() => {
    setModo((prev) => (prev.tipo === 'ancestros' ? { tipo: 'ninguno' } : { tipo: 'ancestros' }));
  }, [setModo]);

  const activarDescendientes = useCallback(() => {
    setModo((prev) => (prev.tipo === 'descendientes' ? { tipo: 'ninguno' } : { tipo: 'descendientes' }));
  }, [setModo]);

  const iniciarComparar = useCallback(() => {
    if (!selectedCommit) return;
    if (commitB === null) {
      setCommitB(selectedCommit.hash);
      return;
    }
    const hashA = selectedCommit.hash;
    const hashB = commitB;
    setCommitB(null);
    if (!selectedRepo) {
      setModo({ tipo: 'camino', hashB, mergeBase: null });
      return;
    }
    void httpGitApi.mergeBase(selectedRepo, hashA, hashB).then((mb) => {
      setModo({ tipo: 'camino', hashB, mergeBase: mb });
    });
  }, [selectedCommit, commitB, selectedRepo, setCommitB, setModo]);

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
    [commits, selectedRepo, currentBranch, setModo],
  );

  const cambiarDensidad = useCallback((d: Densidad) => {
    setDensidad(d);
    localStorage.setItem(CLAVE_DENSIDAD, d);
  }, [setDensidad]);

  const limpiarModo = useCallback(() => {
    setModo({ tipo: 'ninguno' });
    setCommitB(null);
  }, [setModo, setCommitB]);

  const badgeModo = useMemo(() => etiquetaModo(modo), [modo]);

  return {
    onScroll,
    onEnfocar,
    seleccionar,
    revelar,
    onTeclado,
    activarAncestros,
    activarDescendientes,
    iniciarComparar,
    activarExplicacionRama,
    cambiarDensidad,
    limpiarModo,
    badgeModo,
  };
}

interface CommitGraphProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  currentBranch?: string;
  selectedRepo?: string | null;
  nombresRemotos?: string[];
  inteligencia?: InteligenciaGrafo;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedCommit,
  currentBranch,
  selectedRepo,
  nombresRemotos = REMOTOS_VACIOS,
  inteligencia,
  onSelectCommit,
  onContextMenu,
}) => {
  const intel = inteligencia ?? INTELIGENCIA_GRAFO_VACIA;
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const enfocarTrasTecla = React.useRef<string | null>(null);

  const [modo, setModo] = useState<ModoResaltado>({ tipo: 'ninguno' });
  const [commitB, setCommitB] = useState<string | null>(null);
  const [densidad, setDensidad] = useState<Densidad>(leerDensidad);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [foco, setFoco] = useState<GitCommit | null>(null);

  const ROW_HEIGHT = ALTURAS[densidad];
  const COL_WIDTH = 22;
  const GRAPH_OFFSET_X = 22;

  const bases = useBasesDelGrafo(
    selectedRepo,
    currentBranch,
    intel.tracking,
    intel.ramaSeleccionada,
    intel.headDesvinculado,
  );

  const autores = useMemo(() => autoresUnicos(commits), [commits]);
  const ramas = useMemo(() => ramasUnicas(commits), [commits]);
  const processedGraph = useMemo(() => asignarLanes(commits), [commits]);
  const anchoGrafo = useMemo(() => {
    let max = 0;
    for (const commit of processedGraph) {
      if (commit.column > max) max = commit.column;
    }
    return Math.max(180, GRAPH_OFFSET_X + (max + 2) * COL_WIDTH);
  }, [processedGraph]);

  const semantica = useMemo(
    () =>
      resolverSemanticaGrafo({
        ...intel,
        commits,
        ramaActual: currentBranch || 'HEAD',
        mergeBaseUpstream: bases.upstream,
        mergeBaseSeleccion: bases.seleccion,
        mergeBaseUpstreamResuelto: bases.upstreamListo,
        mergeBaseSeleccionResuelto: bases.seleccionLista,
      }),
    [intel, commits, currentBranch, bases.upstream, bases.seleccion, bases.upstreamListo, bases.seleccionLista],
  );

  const familia = useMemo(
    () => (selectedCommit ? familiaDeCommit(selectedCommit.hash, commits) : null),
    [selectedCommit, commits],
  );
  const relacion = useMemo(
    () =>
      selectedCommit
        ? relacionConHead(selectedCommit.hash, semantica.resumen.hashHead, commits)
        : 'otro',
    [selectedCommit, semantica.resumen.hashHead, commits],
  );
  const marcasSeleccion = useMemo(
    () => (selectedCommit ? marcasDeCommit(selectedCommit.hash, semantica) : null),
    [selectedCommit, semantica],
  );

  const focoInfo = useMemo(() => {
    if (!foco || foco.hash === selectedCommit?.hash) return null;
    return {
      shortHash: foco.shortHash,
      message: foco.message,
      marcas: textoMarcas(marcasDeCommit(foco.hash, semantica)),
    };
  }, [foco, selectedCommit, semantica]);

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

  const resaltados = useMemo<Set<string> | null>(
    () => calcularResaltados(modo, selectedCommit, commits),
    [modo, selectedCommit, commits],
  );

  const esResaltado = useCallback(
    (hash: string): boolean | null => {
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

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sync = () => setViewportH(el.clientHeight);
    sync();
    const obs = new ResizeObserver(sync);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, [ROW_HEIGHT]);

  useEffect(() => {
    const hash = enfocarTrasTecla.current;
    if (!hash || !scrollerRef.current) return;
    const nodo = scrollerRef.current.querySelector<HTMLButtonElement>(`[data-commit="${CSS.escape(hash)}"]`);
    if (!nodo) return;
    enfocarTrasTecla.current = null;
    nodo.focus();
  }, [selectedCommit, scrollTop]);

  const ramasVisibles = useMemo(() => {
    const set = new Set<string>();
    if (currentBranch) set.add(currentBranch);
    for (const c of commits.slice(0, 12)) {
      c.branches?.forEach((b) => set.add(b));
      if (set.size >= 4) break;
    }
    return [...set].slice(0, 4);
  }, [commits, currentBranch]);

  const {
    onScroll,
    onEnfocar,
    seleccionar,
    revelar,
    onTeclado,
    activarAncestros,
    activarDescendientes,
    iniciarComparar,
    activarExplicacionRama,
    cambiarDensidad,
    limpiarModo,
    badgeModo,
  } = useAccionesGrafo({
    commits,
    processedGraph,
    selectedCommit,
    selectedRepo,
    currentBranch,
    commitB,
    modo,
    onSelectCommit,
    rowHeight: ROW_HEIGHT,
    scrollerRef,
    enfocarTrasTecla,
    setScrollTop,
    setFoco,
    setModo,
    setCommitB,
    setDensidad,
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden min-w-0">
      <BarraSuperiorGrafo
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        hashesCoincidentes={hashesCoincidentes}
        totalCommits={commits.length}
        filtroAbierto={filtroAbierto}
        onToggleFiltro={() => setFiltroAbierto((v) => !v)}
        densidad={densidad}
        onCambiarDensidad={cambiarDensidad}
        ramasVisibles={ramasVisibles}
      />

      {filtroAbierto && (
        <BarraFiltrosGrafo
          modo={modo}
          autores={autores}
          ramas={ramas}
          selectedCommit={selectedCommit}
          commitB={commitB}
          badgeModo={badgeModo}
          onModoAutor={(autor) => setModo(autor ? { tipo: 'autor', autor } : { tipo: 'ninguno' })}
          onModoRama={(rama) => {
            if (!rama) { setModo({ tipo: 'ninguno' }); return; }
            activarExplicacionRama(rama);
          }}
          onActivarAncestros={activarAncestros}
          onActivarDescendientes={activarDescendientes}
          onIniciarComparar={iniciarComparar}
          onLimpiarModo={limpiarModo}
        />
      )}

      <BarraSemanticaGrafo resumen={semantica.resumen} foco={focoInfo} />

      {selectedCommit && familia && marcasSeleccion ? (
        <FichaCommitSeleccionado
          commit={selectedCommit}
          familia={familia}
          relacion={relacion}
          marcas={marcasSeleccion}
          commitB={commitB}
          nombresRemotos={nombresRemotos}
          onElegir={revelar}
        />
      ) : null}

      <div className="h-8 bg-surface-container border-b border-outline-variant px-4 flex items-center text-label-caps text-on-surface-variant select-none shrink-0 min-w-0">
        <div
          className="shrink-0"
          style={{ width: anchoGrafo }}
          title="Línea continua: primer padre. Línea punteada: merge."
        >
          Grafo / Ramas
        </div>
        <div className="flex-1 truncate">Mensaje de Commit</div>
        <div className="w-36 shrink-0 hidden md:block">Autor</div>
        <div className="w-28 shrink-0 hidden lg:block">Fecha</div>
        <div className="w-20 shrink-0 text-right font-mono">Hash</div>
      </div>

      <div
        ref={scrollerRef}
        role="listbox"
        tabIndex={0}
        aria-label="Grafo de commits. Flechas arriba y abajo mueven la selección."
        aria-describedby="semantica-grafo"
        className="flex-1 overflow-y-auto overflow-x-auto relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        onScroll={onScroll}
        onKeyDown={onTeclado}
        onMouseLeave={() => onEnfocar(null)}
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
            onSelectCommit={seleccionar}
            onContextMenu={onContextMenu}
            onEnfocar={onEnfocar}
            nombresRemotos={nombresRemotos}
            esResaltado={esResaltado}
            semantica={semantica}
            scrollTop={scrollTop}
            viewportH={viewportH}
            ROW_HEIGHT={ROW_HEIGHT}
            COL_WIDTH={COL_WIDTH}
            GRAPH_OFFSET_X={GRAPH_OFFSET_X}
            anchoGrafo={anchoGrafo}
          />
        )}
      </div>
    </div>
  );
};

function refDeCabeza(ramaActual: string | undefined, headDesvinculado: boolean): string {
  if (!ramaActual || headDesvinculado || /\s/.test(ramaActual)) return 'HEAD';
  return ramaActual;
}

function useBasesDelGrafo(
  repo: string | null | undefined,
  ramaActual: string | undefined,
  tracking: string | null,
  ramaSeleccionada: string | null,
  headDesvinculado: boolean,
) {
  const [upstream, setUpstream] = useState<string | null>(null);
  const [upstreamListo, setUpstreamListo] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [seleccionLista, setSeleccionLista] = useState(false);

  useEffect(() => {
    if (!repo || !tracking) {
      setUpstream(null);
      setUpstreamListo(true);
      return;
    }
    const refA = refDeCabeza(ramaActual, headDesvinculado);
    if (mismaRef(tracking, refA) || (ramaActual ? mismaRef(tracking, ramaActual) : false)) {
      setUpstream(null);
      setUpstreamListo(true);
      return;
    }
    let vivo = true;
    setUpstreamListo(false);
    void httpGitApi.mergeBase(repo, refA, tracking).then(
      (mb) => {
        if (!vivo) return;
        setUpstream(mb);
        setUpstreamListo(true);
      },
      () => {
        if (!vivo) return;
        setUpstream(null);
        setUpstreamListo(true);
      },
    );
    return () => {
      vivo = false;
    };
  }, [repo, ramaActual, tracking, headDesvinculado]);

  useEffect(() => {
    if (!repo || !ramaSeleccionada) {
      setSeleccion(null);
      setSeleccionLista(false);
      return;
    }
    const refA = refDeCabeza(ramaActual, headDesvinculado);
    if (mismaRef(ramaSeleccionada, refA) || (ramaActual ? mismaRef(ramaSeleccionada, ramaActual) : false)) {
      setSeleccion(null);
      setSeleccionLista(true);
      return;
    }
    let vivo = true;
    setSeleccionLista(false);
    void httpGitApi.mergeBase(repo, refA, ramaSeleccionada).then(
      (mb) => {
        if (!vivo) return;
        setSeleccion(mb);
        setSeleccionLista(true);
      },
      () => {
        if (!vivo) return;
        setSeleccion(null);
        setSeleccionLista(true);
      },
    );
    return () => {
      vivo = false;
    };
  }, [repo, ramaActual, ramaSeleccionada, headDesvinculado]);

  return { upstream, upstreamListo, seleccion, seleccionLista };
}

function calcularResaltados(
  modo: ModoResaltado,
  selectedCommit: GitCommit | null,
  commits: GitCommit[],
): Set<string> | null {
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
      const tip = commits.find((c) => c.branches?.includes(modo.rama));
      if (!tip) return null;
      return commitsDeLaRama(tip.hash, modo.mergeBase, commits);
    }
    default:
      return null;
  }
}

const GrafoVirtualizado = memo(function GrafoVirtualizado({
  processedGraph,
  selectedCommit,
  commitB,
  nombresRemotos,
  semantica,
  onSelectCommit,
  onContextMenu,
  onEnfocar,
  esResaltado,
  scrollTop,
  viewportH,
  ROW_HEIGHT,
  COL_WIDTH,
  GRAPH_OFFSET_X,
  anchoGrafo,
}: {
  processedGraph: CommitConLane[];
  selectedCommit: GitCommit | null;
  commitB: string | null;
  nombresRemotos: string[];
  semantica: ReturnType<typeof resolverSemanticaGrafo>;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
  onEnfocar: (hash: string | null) => void;
  esResaltado: (hash: string) => boolean | null;
  scrollTop: number;
  viewportH: number;
  ROW_HEIGHT: number;
  COL_WIDTH: number;
  GRAPH_OFFSET_X: number;
  anchoGrafo: number;
}) {
  const overscan = 12;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const visible = Math.ceil(viewportH / ROW_HEIGHT) + overscan * 2;
  const end = Math.min(processedGraph.length, start + visible);
  const slice = processedGraph.slice(start, end);

  const indicePorHash = useMemo(() => {
    const m = new Map<string, number>();
    processedGraph.forEach((c, i) => m.set(c.hash, i));
    return m;
  }, [processedGraph]);

  const aristas = useMemo(
    () => aristasQueCruzanVentana(processedGraph, start, end),
    [processedGraph, start, end],
  );

  return (
    <div className="relative" style={{ height: `${processedGraph.length * ROW_HEIGHT}px`, minWidth: `${Math.max(anchoGrafo + 520, 800)}px` }}>
      <svg
        className="absolute top-0 left-4 pointer-events-none"
        style={{ width: `${anchoGrafo}px`, height: `${processedGraph.length * ROW_HEIGHT}px` }}
      >
        {aristas.map((arista) => {
          const iHijo = indicePorHash.get(arista.hijo);
          const iPadre = indicePorHash.get(arista.padre);
          if (iHijo === undefined || iPadre === undefined) return null;
          const hijo = processedGraph[iHijo];
          const padre = processedGraph[iPadre];
          const x1 = GRAPH_OFFSET_X + hijo.column * COL_WIDTH;
          const y1 = iHijo * ROW_HEIGHT + ROW_HEIGHT / 2;
          const x2 = GRAPH_OFFSET_X + padre.column * COL_WIDTH;
          const y2 = iPadre * ROW_HEIGHT + ROW_HEIGHT / 2;
          const path = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
          const marcaHijo = esResaltado(arista.hijo);
          const marcaPadre = esResaltado(arista.padre);
          const estilo = estiloAristaSemantica(arista.hijo, arista.primerPadre, semantica, hijo.color);
          return (
            <path
              key={`${arista.hijo}-${arista.padre}`}
              d={path}
              fill="none"
              stroke={estilo.stroke}
              strokeWidth={estilo.ancho}
              strokeOpacity={marcaHijo === false || marcaPadre === false ? 0.15 : 0.9}
              strokeDasharray={estilo.dasharray}
            />
          );
        })}
      </svg>

      {slice.map((commit) => (
        <FilaCommit
          key={commit.hash}
          commit={commit}
          index={indicePorHash.get(commit.hash) ?? 0}
          isSelected={selectedCommit?.hash === commit.hash}
          isCompareB={commitB === commit.hash}
          atenuado={esResaltado(commit.hash) === false}
          semantica={semantica}
          nombresRemotos={nombresRemotos}
          nodeX={GRAPH_OFFSET_X + commit.column * COL_WIDTH}
          anchoGrafo={anchoGrafo}
          ROW_HEIGHT={ROW_HEIGHT}
          onSelectCommit={onSelectCommit}
          onContextMenu={onContextMenu}
          onEnfocar={onEnfocar}
        />
      ))}
    </div>
  );
});

function claseSuperficieFila(isSelected: boolean, isCompareB: boolean, marcas: MarcasCommit): string {
  if (isSelected) {
    return 'bg-primary-container/10 border-l-2 border-l-primary text-on-surface glow-biolume-sm motion-reduce:shadow-none';
  }
  if (marcas.preview) return 'bg-magma/5 border-l-2 border-l-magma text-on-surface';
  if (isCompareB) return 'bg-secondary/10 border-l-2 border-l-secondary text-on-surface';
  if (marcas.head) return 'bg-ion/5 border-l-2 border-l-ion/40 text-on-surface';
  if (marcas.base) return 'bg-gold/5 border-l-2 border-l-gold text-on-surface';
  return 'hover:bg-surface-container-high/40 text-on-surface-variant';
}

function InsigniasFila({
  marcas,
  commit,
  nombresRemotos,
}: {
  marcas: MarcasCommit;
  commit: CommitConLane;
  nombresRemotos: string[];
}) {
  return (
    <>
      {marcas.head ? <ChipRama nombre="HEAD" tipo="head" /> : null}
      {marcas.base ? (
        <span title="Merge-base" className="px-1 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold border border-gold/40 shrink-0">
          BASE
        </span>
      ) : null}
      {marcas.saliente ? (
        <span title="Por delante del remoto" className="px-1 py-0.5 rounded text-[10px] font-bold text-ember border border-ember/40 shrink-0">
          ↑
        </span>
      ) : null}
      {marcas.entrante ? (
        <span title="Por detrás del remoto" className="px-1 py-0.5 rounded text-[10px] font-bold text-secondary border border-secondary/40 shrink-0">
          ↓
        </span>
      ) : null}
      {marcas.preview ? (
        <span title="En la vista previa" className="px-1 py-0.5 rounded text-[10px] font-bold text-magma border border-magma/40 shrink-0">
          PRE
        </span>
      ) : null}
      {marcas.recuperacion ? (
        <span title={marcas.notaRecuperacion ?? 'Punto de recuperación'} className="px-1 py-0.5 rounded text-[10px] font-bold text-ember border border-ember/40 shrink-0">
          REC
        </span>
      ) : null}
      {commit.branches?.map((nombre) => (
        <ChipRama key={nombre} nombre={nombre} tipo={esRefRemota(nombre, nombresRemotos) ? 'remota' : 'rama'} />
      ))}
      {commit.tags?.map((nombre) => (
        <ChipRama key={nombre} nombre={nombre} tipo="tag" />
      ))}
    </>
  );
}

function claseAnillo(marcas: MarcasCommit, isCompareB: boolean): string {
  if (marcas.preview) return 'ring-2 ring-magma';
  if (marcas.head) return 'glow-biolume-sm ring-2 ring-ion/40 motion-reduce:shadow-none motion-reduce:ring-0';
  if (marcas.base) return 'ring-2 ring-gold';
  if (marcas.recuperacion) return 'ring-2 ring-ember';
  if (isCompareB) return 'ring-2 ring-secondary/70';
  if (marcas.saliente) return 'ring-2 ring-ember/80';
  if (marcas.entrante) return 'ring-2 ring-secondary/80';
  return 'group-hover:ring-2 group-hover:ring-on-surface/30';
}

const FilaCommit = memo(function FilaCommit({
  commit,
  index,
  isSelected,
  isCompareB,
  atenuado,
  semantica,
  nombresRemotos,
  nodeX,
  anchoGrafo,
  ROW_HEIGHT,
  onSelectCommit,
  onContextMenu,
  onEnfocar,
}: {
  commit: CommitConLane;
  index: number;
  isSelected: boolean;
  isCompareB: boolean;
  atenuado: boolean;
  semantica: ReturnType<typeof resolverSemanticaGrafo>;
  nombresRemotos: string[];
  nodeX: number;
  anchoGrafo: number;
  ROW_HEIGHT: number;
  onSelectCommit: (commit: GitCommit) => void;
  onContextMenu: (commit: GitCommit, position: { x: number; y: number }) => void;
  onEnfocar: (hash: string | null) => void;
}) {
  const marcas = marcasDeCommit(commit.hash, semantica);
  const etiqueta = [
    textoMarcas(marcas),
    commit.shortHash,
    commit.message,
    commit.branches?.length ? `ramas ${commit.branches.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <button
      type="button"
      data-commit={commit.hash}
      aria-label={etiqueta}
      aria-current={marcas.head ? 'true' : undefined}
      onClick={() => onSelectCommit(commit)}
      onMouseEnter={() => onEnfocar(commit.hash)}
      onFocus={() => onEnfocar(commit.hash)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(commit, { x: e.clientX, y: e.clientY });
      }}
      style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
      className={cn(
        'group absolute left-0 right-0 px-4 flex items-center text-label-md cursor-pointer border-b border-outline-variant/30 text-left w-full transition-colors motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        claseSuperficieFila(isSelected, isCompareB, marcas),
        atenuado ? 'opacity-25' : null,
      )}
    >
      <div className="shrink-0 relative h-full" style={{ width: anchoGrafo }}>
        <div
          className={cn(
            'absolute w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest transform -translate-x-1/2 -translate-y-1/2',
            claseAnillo(marcas, isCompareB),
          )}
          style={{
            left: `${nodeX}px`,
            top: `${ROW_HEIGHT / 2}px`,
            backgroundColor: commit.color,
          }}
        />
      </div>
      <div className="flex-1 flex items-center gap-1.5 truncate pr-4 min-w-0">
        <InsigniasFila marcas={marcas} commit={commit} nombresRemotos={nombresRemotos} />
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
});

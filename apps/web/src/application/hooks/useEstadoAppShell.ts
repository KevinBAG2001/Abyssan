import { useCallback, useMemo, useState } from 'react';
import { GitCommit, GitBranch } from '../../types/git';
import type { FileStatusModel } from '../../domain/models/GitModels';
import { httpGitApi } from '../../infrastructure/api/HttpGitApi';
import {
  leerModoAprendizaje,
  guardarModoAprendizaje,
} from '../../domain/explicaciones/plantillasExplicacion';
import type { TipoOperacionJournal } from '../../domain/models/GitModels';

const CLAVE_PULL = 'abyssan.modoPull';

interface UltimaOp {
  id?: string;
  tipo?: string;
  comandoGit?: string;
  puedeDeshacer?: boolean;
  motivoBloqueo?: string;
}

interface Deps {
  commits: GitCommit[];
  selectedRepo: string | null;
  status: { currentBranch?: string } | null;
  selectedCommit: GitCommit | null;
  setSelectedCommit: (c: GitCommit | null) => void;
  setSelectedFile: (f: FileStatusModel | null) => void;
  setCurrentDiff: (d: string) => void;
  showToast: (msg: string, tipo?: 'success' | 'error') => void;
  ultimaOp: UltimaOp;
}

export function useEstadoAppShell(deps: Deps) {
  const [isStashModalOpen, setIsStashModalOpen] = useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consolaExpandida, setConsolaExpandida] = useState(false);
  const [nacimientoAbierto, setNacimientoAbierto] = useState(false);
  const [forjasAbiertas, setForjasAbiertas] = useState(false);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [identidadAbierta, setIdentidadAbierta] = useState(false);
  const [timelineAbierta, setTimelineAbierta] = useState(false);
  const [ramaInspeccionada, setRamaInspeccionada] = useState<string | null>(null);
  const [modoPull, setModoPull] = useState<'merge' | 'rebase'>(
    () => (localStorage.getItem(CLAVE_PULL) as 'merge' | 'rebase') || 'merge',
  );
  const [modoAprendizaje, setModoAprendizaje] = useState(leerModoAprendizaje);
  const [opIdDescartada, setOpIdDescartada] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    commit: GitCommit;
    position: { x: number; y: number };
  } | null>(null);

  const explicacionActiva = useMemo(() => {
    if (!modoAprendizaje) return null;
    if (!deps.ultimaOp.id || !deps.ultimaOp.tipo) return null;
    if (deps.ultimaOp.id === opIdDescartada) return null;
    return {
      tipo: deps.ultimaOp.tipo as TipoOperacionJournal,
      comandoGit: deps.ultimaOp.comandoGit,
    };
  }, [modoAprendizaje, deps.ultimaOp.id, deps.ultimaOp.tipo, deps.ultimaOp.comandoGit, opIdDescartada]);

  const cambiarModoAprendizaje = useCallback((activo: boolean) => {
    setModoAprendizaje(activo);
    guardarModoAprendizaje(activo);
  }, []);

  const abrirConsola = useCallback(() => setIsConsoleOpen(true), []);
  const abrirPaleta = useCallback(() => setPaletaAbierta(true), []);

  const inspectarRama = useCallback(
    (branch: GitBranch) => {
      const hallado = deps.commits.find(
        (c) => c.hash.startsWith(branch.commit) || branch.commit.startsWith(c.hash),
      );
      deps.setSelectedCommit(
        hallado ?? {
          hash: branch.commit,
          shortHash: branch.commit.slice(0, 7),
          parents: [],
          authorName: '',
          authorEmail: '',
          date: '',
          message: `Punta de ${branch.name.replace(/^remotes\//, '')}`,
          branches: [branch.name.replace(/^remotes\//, '')],
        },
      );
      setRamaInspeccionada(branch.name);
      deps.setSelectedFile(null);
      deps.setCurrentDiff('');
    },
    [deps],
  );

  const inspectarArchivo = useCallback(
    async (
      filePath: string,
      opciones: { commit?: string; desde?: string; hasta?: string },
    ) => {
      if (!deps.selectedRepo) return;
      try {
        const diff = await httpGitApi.getDiff(deps.selectedRepo, filePath, false, opciones);
        deps.setSelectedFile({ path: filePath, status: 'modified' as const, staged: false });
        deps.setCurrentDiff(diff);
      } catch (err: unknown) {
        deps.showToast(err instanceof Error ? err.message : 'Error obteniendo diferencias', 'error');
      }
    },
    [deps],
  );

  const alternarConsola = useCallback(() => {
    if (isConsoleOpen) setConsolaExpandida(false);
    setIsConsoleOpen((abierta) => !abierta);
  }, [isConsoleOpen]);

  const cambiarModoPull = useCallback((modo: 'merge' | 'rebase') => {
    setModoPull(modo);
    localStorage.setItem(CLAVE_PULL, modo);
  }, []);

  return {
    modales: {
      isStashModalOpen,
      setIsStashModalOpen,
      isRemoteModalOpen,
      setIsRemoteModalOpen,
      isCompareModalOpen,
      setIsCompareModalOpen,
      nacimientoAbierto,
      setNacimientoAbierto,
      forjasAbiertas,
      setForjasAbiertas,
      paletaAbierta,
      setPaletaAbierta,
      identidadAbierta,
      setIdentidadAbierta,
      timelineAbierta,
      setTimelineAbierta,
    },
    consola: {
      isConsoleOpen,
      consolaExpandida,
      setConsolaExpandida,
      alternarConsola,
      abrirConsola,
    },
    contextMenu,
    setContextMenu,
    ramaInspeccionada,
    setRamaInspeccionada,
    modoPull,
    cambiarModoPull,
    modoAprendizaje,
    cambiarModoAprendizaje,
    explicacionActiva,
    descartarExplicacion: useCallback(() => setOpIdDescartada(deps.ultimaOp.id ?? null), [deps.ultimaOp.id]),
    abrirPaleta,
    inspectarRama,
    inspectarArchivo,
  };
}

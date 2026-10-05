import type {
  BranchModel,
  EntradaJournal,
  GitOperacionModel,
  PreviewOperacionModel,
  RepositoryStatusModel,
} from '../domain/models/GitModels';
import type { UltimaOperacion } from '../infrastructure/api/HttpGitApi';
import type { InteligenciaGrafo } from '../lib/semantica-grafo';

type EntradaInteligenciaVisible = {
  headDesvinculado: boolean;
  status: RepositoryStatusModel | null;
  branches: BranchModel[];
  operaciones: GitOperacionModel[];
  ramaInspeccionada: string | null;
  preview: PreviewOperacionModel | null | undefined;
  journal: EntradaJournal[];
  ultimaOp: UltimaOperacion;
};

export function construirInteligenciaGrafo(entrada: EntradaInteligenciaVisible): InteligenciaGrafo {
  const textos = new Set<string>();
  if (entrada.ultimaOp.puedeDeshacer && entrada.ultimaOp.estadoAnterior) {
    textos.add(entrada.ultimaOp.estadoAnterior);
  }
  for (const item of entrada.journal) {
    if (!item.deshecha && item.puedeDeshacer && item.estadoAnterior) {
      textos.add(item.estadoAnterior);
    }
  }

  const activa = entrada.operaciones.find((op) => op.estado === 'en_cola' || op.estado === 'corriendo');
  const preview = entrada.preview;

  return {
    headDesvinculado: entrada.headDesvinculado,
    tracking: entrada.status?.tracking ?? null,
    ahead: entrada.status?.ahead ?? 0,
    behind: entrada.status?.behind ?? 0,
    isMerging: Boolean(entrada.status?.isMerging),
    isRebasing: Boolean(entrada.status?.isRebasing),
    ramaSeleccionada: entrada.ramaInspeccionada,
    puntas: entrada.branches.map((rama) => ({
      nombre: rama.name,
      hash: rama.commit,
      actual: rama.current,
      remota: Boolean(rama.isRemote),
    })),
    hashesPreview: preview?.commitsAfectados.map((commit) => commit.hash) ?? [],
    hashBasePreview: preview?.estadoActual.base ?? null,
    advertenciasPreview: preview?.advertencias ?? [],
    previewActivo: Boolean(preview),
    seguroEjecutar: preview ? preview.seguroEjecutar : null,
    textosRecuperacion: [...textos],
    operacion:
      activa && (activa.estado === 'en_cola' || activa.estado === 'corriendo')
        ? {
            tipo: activa.tipo,
            estado: activa.estado,
            progreso: activa.progreso,
            etapa: activa.etapa,
          }
        : null,
  };
}

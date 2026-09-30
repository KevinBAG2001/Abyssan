// Austria: Semántica del grafo (bloque G). Pura: sin React ni red.
// Marca HEAD, merge-base, ahead/behind, preview y recuperación sobre el log ya cargado.

import type { GitCommit } from '../types/git';
import { commitsDeLaRama, construirMapaHijos, esCommitHead, obtenerAncestros, obtenerDescendientes } from './grafo-utils';

export type PuntaRama = {
  nombre: string;
  hash: string;
  actual: boolean;
  remota: boolean;
};

export type OperacionVisibleGrafo = {
  tipo: string;
  estado: 'en_cola' | 'corriendo';
  progreso: number;
  etapa?: string;
};

export type InteligenciaGrafo = {
  headDesvinculado: boolean;
  tracking: string | null;
  ahead: number;
  behind: number;
  isMerging: boolean;
  isRebasing: boolean;
  ramaSeleccionada: string | null;
  puntas: PuntaRama[];
  hashesPreview: string[];
  hashBasePreview: string | null;
  advertenciasPreview: string[];
  previewActivo: boolean;
  seguroEjecutar: boolean | null;
  textosRecuperacion: string[];
  operacion: OperacionVisibleGrafo | null;
};

export const INTELIGENCIA_GRAFO_VACIA: InteligenciaGrafo = {
  headDesvinculado: false,
  tracking: null,
  ahead: 0,
  behind: 0,
  isMerging: false,
  isRebasing: false,
  ramaSeleccionada: null,
  puntas: [],
  hashesPreview: [],
  hashBasePreview: null,
  advertenciasPreview: [],
  previewActivo: false,
  seguroEjecutar: null,
  textosRecuperacion: [],
  operacion: null,
};

export type RelacionHead = 'es-head' | 'ancestro' | 'descendiente' | 'otro';

export type FamiliarCommit = {
  hash: string;
  shortHash: string;
  message: string | null;
  enGrafo: boolean;
};

export type FamiliaCommit = {
  padres: FamiliarCommit[];
  hijos: FamiliarCommit[];
  hijosOcultos: number;
};

export type MarcasCommit = {
  head: boolean;
  base: boolean;
  saliente: boolean;
  entrante: boolean;
  preview: boolean;
  recuperacion: boolean;
  notaRecuperacion: string | null;
};

export type ResumenSemantico = {
  hashHead: string | null;
  ramaActual: string;
  tracking: string | null;
  ramaSeleccionada: string | null;
  hashMergeBaseUpstream: string | null;
  hashMergeBaseSeleccion: string | null;
  ahead: number;
  behind: number;
  salientesEnVentana: number;
  entrantesEnVentana: number;
  propiosSeleccion: number;
  baseUpstreamLista: boolean;
  baseSeleccionLista: boolean;
  ventanaIncompleta: boolean;
  previewActivo: boolean;
  previewSeguro: boolean | null;
  advertencias: string[];
  recuperables: number;
  recuperacionSinCommit: boolean;
  operacion: OperacionVisibleGrafo | null;
  isMerging: boolean;
  isRebasing: boolean;
};

export type SemanticaGrafo = {
  resumen: ResumenSemantico;
  salientes: ReadonlySet<string>;
  entrantes: ReadonlySet<string>;
  preview: ReadonlySet<string>;
  bases: ReadonlySet<string>;
  recuperacion: ReadonlyMap<string, string>;
};

export type EntradaSemanticaGrafo = InteligenciaGrafo & {
  commits: GitCommit[];
  ramaActual: string;
  mergeBaseUpstream: string | null;
  mergeBaseSeleccion: string | null;
  /** True cuando la petición de merge-base con el upstream ya terminó (con o sin hash). */
  mergeBaseUpstreamResuelto: boolean;
  mergeBaseSeleccionResuelto: boolean;
};

const LIMITE_HIJOS = 4;
const RE_HASH = /(?:^|[^/\w])([0-9a-f]{7,40})\b/gi;

export function mismaRef(a: string, b: string): boolean {
  return a.replace(/^remotes\//, '') === b.replace(/^remotes\//, '');
}

/** Localiza un hash completo o una abreviatura única dentro del log cargado. */
export function resolverHashEnGrafo(token: string, commits: GitCommit[]): string | null {
  const t = token.trim().toLowerCase();
  if (t.length < 7) return null;
  let unico: string | null = null;
  for (const commit of commits) {
    const hash = commit.hash.toLowerCase();
    const corto = commit.shortHash.toLowerCase();
    const coincide = hash === t || corto === t || hash.startsWith(t);
    if (!coincide) continue;
    if (unico && unico !== commit.hash) return null;
    unico = commit.hash;
  }
  return unico;
}

export function ubicarRecuperacion(commits: GitCommit[], textos: string[]): Map<string, string> {
  const marcas = new Map<string, string>();
  for (const texto of textos) {
    const nota = texto.trim();
    if (!nota) continue;
    RE_HASH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = RE_HASH.exec(nota)) !== null) {
      const hash = resolverHashEnGrafo(match[1], commits);
      if (!hash || marcas.has(hash)) continue;
      marcas.set(hash, nota.length > 140 ? `${nota.slice(0, 137)}…` : nota);
    }
  }
  return marcas;
}

export function exclusivosHastaBase(
  tip: string | null,
  base: string | null,
  commits: GitCommit[],
): { hashes: Set<string>; baseVisible: boolean } {
  if (!tip || !base) return { hashes: new Set(), baseVisible: false };
  const presente = new Set(commits.map((c) => c.hash));
  if (!presente.has(tip) || !presente.has(base)) return { hashes: new Set(), baseVisible: false };
  if (tip !== base && !obtenerAncestros(tip, commits).has(base)) {
    return { hashes: new Set(), baseVisible: false };
  }
  const conjunto = commitsDeLaRama(tip, base, commits);
  conjunto.delete(base);
  return { hashes: conjunto, baseVisible: true };
}

function alcanzables(tip: string, indice: Map<string, GitCommit>): Set<string> {
  const vistos = new Set<string>();
  const cola = [tip];
  while (cola.length > 0) {
    const actual = cola.pop();
    if (!actual || vistos.has(actual)) continue;
    const commit = indice.get(actual);
    if (!commit) continue;
    vistos.add(actual);
    for (const padre of commit.parents) {
      if (!vistos.has(padre)) cola.push(padre);
    }
  }
  return vistos;
}

function diferencia(desde: Set<string>, otros: Set<string>): Set<string> {
  const resultado = new Set<string>();
  for (const hash of desde) {
    if (!otros.has(hash)) resultado.add(hash);
  }
  return resultado;
}

function compartenHistoria(a: Set<string>, b: Set<string>, tipA: string, tipB: string): boolean {
  if (a.has(tipB) || b.has(tipA)) return true;
  for (const hash of b) {
    if (a.has(hash)) return true;
  }
  return false;
}

function puntaDe(nombre: string | null, puntas: PuntaRama[], commits: GitCommit[]): string | null {
  if (!nombre) return null;
  const punta = puntas.find((p) => mismaRef(p.nombre, nombre));
  if (punta) {
    const resuelto = resolverHashEnGrafo(punta.hash, commits);
    if (resuelto) return resuelto;
  }
  const porEtiqueta = commits.find((c) => c.branches?.some((rama) => mismaRef(rama, nombre)));
  return porEtiqueta?.hash ?? null;
}

function normalizarConjunto(hashes: string[], commits: GitCommit[]): Set<string> {
  const set = new Set<string>();
  for (const hash of hashes) {
    const resuelto = resolverHashEnGrafo(hash, commits);
    if (resuelto) set.add(resuelto);
  }
  return set;
}

export function resolverSemanticaGrafo(entrada: EntradaSemanticaGrafo): SemanticaGrafo {
  const { commits } = entrada;
  const head = commits.find((c) => esCommitHead(c));
  let hashHead = head?.hash ?? null;
  if (!hashHead && !entrada.headDesvinculado) {
    hashHead = puntaDe(entrada.ramaActual, entrada.puntas, commits);
  }

  const tracking = entrada.tracking;
  const hashUpstream = puntaDe(tracking, entrada.puntas, commits);
  const indice = new Map<string, GitCommit>();
  for (const commit of commits) indice.set(commit.hash, commit);

  let salientes = new Set<string>();
  let entrantes = new Set<string>();
  if (hashHead && hashUpstream && indice.has(hashHead) && indice.has(hashUpstream)) {
    const desdeHead = alcanzables(hashHead, indice);
    const desdeUpstream = alcanzables(hashUpstream, indice);
    if (compartenHistoria(desdeHead, desdeUpstream, hashHead, hashUpstream)) {
      salientes = diferencia(desdeHead, desdeUpstream);
      entrantes = diferencia(desdeUpstream, desdeHead);
    }
  } else {
    salientes = exclusivosHastaBase(hashHead, entrada.mergeBaseUpstream, commits).hashes;
    entrantes = exclusivosHastaBase(hashUpstream, entrada.mergeBaseUpstream, commits).hashes;
  }

  const hashTipSeleccion = puntaDe(entrada.ramaSeleccionada, entrada.puntas, commits);
  let propios = new Set<string>();
  if (hashHead && hashTipSeleccion && indice.has(hashHead) && indice.has(hashTipSeleccion) && hashTipSeleccion !== hashHead) {
    const desdeHead = alcanzables(hashHead, indice);
    const desdeSeleccion = alcanzables(hashTipSeleccion, indice);
    if (compartenHistoria(desdeSeleccion, desdeHead, hashTipSeleccion, hashHead)) {
      propios = diferencia(desdeSeleccion, desdeHead);
    }
  } else if (hashTipSeleccion !== hashHead) {
    propios = exclusivosHastaBase(hashTipSeleccion, entrada.mergeBaseSeleccion, commits).hashes;
  }

  const preview = normalizarConjunto(entrada.hashesPreview, commits);
  const recuperacion = ubicarRecuperacion(commits, entrada.textosRecuperacion);

  const bases = new Set<string>();
  for (const hash of [entrada.mergeBaseUpstream, entrada.mergeBaseSeleccion, entrada.hashBasePreview]) {
    if (!hash) continue;
    const resuelto = resolverHashEnGrafo(hash, commits);
    if (resuelto) bases.add(resuelto);
  }

  const ventanaIncompleta =
    Boolean(entrada.tracking) &&
    entrada.mergeBaseUpstreamResuelto &&
    ((entrada.ahead > 0 && salientes.size === 0) ||
      (entrada.behind > 0 && entrantes.size === 0));

  const advertencias: string[] = [];
  if (entrada.isMerging) advertencias.push('Hay un merge en curso.');
  if (entrada.isRebasing) advertencias.push('Hay un rebase en curso.');
  if (entrada.previewActivo && entrada.seguroEjecutar === false) {
    advertencias.push('La vista previa marca la operación como no segura.');
  }
  for (const texto of entrada.advertenciasPreview) {
    if (texto && !advertencias.includes(texto)) advertencias.push(texto);
  }
  if (ventanaIncompleta) {
    advertencias.push('Parte del ahead/behind queda fuera de los commits cargados.');
  }
  const recuperacionSinCommit = entrada.textosRecuperacion.some((t) => t.trim().length > 0) && recuperacion.size === 0;
  if (recuperacionSinCommit) {
    advertencias.push('El journal tiene recuperación, pero no nombra un commit de esta ventana.');
  }

  return {
    resumen: {
      hashHead,
      ramaActual: entrada.ramaActual,
      tracking,
      ramaSeleccionada: entrada.ramaSeleccionada,
      hashMergeBaseUpstream: entrada.mergeBaseUpstream,
      hashMergeBaseSeleccion: entrada.mergeBaseSeleccion,
      ahead: entrada.ahead,
      behind: entrada.behind,
      salientesEnVentana: salientes.size,
      entrantesEnVentana: entrantes.size,
      propiosSeleccion: propios.size,
      baseUpstreamLista: entrada.mergeBaseUpstreamResuelto,
      baseSeleccionLista: entrada.mergeBaseSeleccionResuelto,
      ventanaIncompleta,
      previewActivo: entrada.previewActivo,
      previewSeguro: entrada.seguroEjecutar,
      advertencias,
      recuperables: recuperacion.size,
      recuperacionSinCommit,
      operacion: entrada.operacion,
      isMerging: entrada.isMerging,
      isRebasing: entrada.isRebasing,
    },
    salientes,
    entrantes,
    preview,
    bases,
    recuperacion,
  };
}

export function marcasDeCommit(hash: string, semantica: SemanticaGrafo): MarcasCommit {
  return {
    head: semantica.resumen.hashHead === hash,
    base: semantica.bases.has(hash),
    saliente: semantica.salientes.has(hash),
    entrante: semantica.entrantes.has(hash),
    preview: semantica.preview.has(hash),
    recuperacion: semantica.recuperacion.has(hash),
    notaRecuperacion: semantica.recuperacion.get(hash) ?? null,
  };
}

export function textoMarcas(marcas: MarcasCommit): string {
  const partes: string[] = [];
  if (marcas.head) partes.push('HEAD');
  if (marcas.base) partes.push('merge-base');
  if (marcas.saliente) partes.push('por delante del remoto');
  if (marcas.entrante) partes.push('por detrás del remoto');
  if (marcas.preview) partes.push('en la vista previa');
  if (marcas.recuperacion) partes.push('punto de recuperación');
  return partes.join(', ');
}

export function relacionConHead(hash: string, hashHead: string | null, commits: GitCommit[]): RelacionHead {
  if (!hashHead) return 'otro';
  if (hash === hashHead) return 'es-head';
  if (obtenerAncestros(hashHead, commits).has(hash)) return 'ancestro';
  if (obtenerDescendientes(hashHead, commits).has(hash)) return 'descendiente';
  return 'otro';
}

export function textoRelacion(relacion: RelacionHead): string {
  switch (relacion) {
    case 'es-head':
      return 'Este commit es HEAD.';
    case 'ancestro':
      return 'Es ancestro de HEAD: ya está en la historia actual.';
    case 'descendiente':
      return 'Es descendiente de HEAD: está por delante del checkout.';
    default:
      return 'No está en la línea directa de HEAD.';
  }
}

export function familiaDeCommit(hash: string, commits: GitCommit[]): FamiliaCommit {
  const indice = new Map<string, GitCommit>();
  for (const commit of commits) indice.set(commit.hash, commit);
  const hijosMap = construirMapaHijos(commits);
  const actual = indice.get(hash);

  const padres: FamiliarCommit[] = (actual?.parents ?? []).map((padre) => {
    const hallado = indice.get(padre);
    return {
      hash: padre,
      shortHash: hallado?.shortHash ?? padre.slice(0, 7),
      message: hallado?.message ?? null,
      enGrafo: Boolean(hallado),
    };
  });

  const hashesHijos = hijosMap.get(hash) ?? [];
  const hijos = hashesHijos.slice(0, LIMITE_HIJOS).map((hijo) => {
    const hallado = indice.get(hijo);
    return {
      hash: hijo,
      shortHash: hallado?.shortHash ?? hijo.slice(0, 7),
      message: hallado?.message ?? null,
      enGrafo: Boolean(hallado),
    };
  });

  return {
    padres,
    hijos,
    hijosOcultos: Math.max(0, hashesHijos.length - hijos.length),
  };
}

export function estiloAristaSemantica(
  hijo: string,
  primerPadre: boolean,
  semantica: Pick<SemanticaGrafo, 'salientes' | 'entrantes' | 'preview'>,
  colorLane: string,
): { stroke: string; dasharray?: string; ancho: number } {
  let stroke = colorLane;
  let ancho = 2.5;
  // El color lo decide el hijo: la arista hacia el padre cuenta aunque la base no esté en el conjunto.
  if (semantica.preview.has(hijo)) {
    stroke = 'var(--color-magma)';
    ancho = 3;
  } else if (semantica.salientes.has(hijo)) {
    stroke = 'var(--color-ember)';
    ancho = 3;
  } else if (semantica.entrantes.has(hijo)) {
    stroke = 'var(--color-secondary)';
    ancho = 3;
  }
  return {
    stroke,
    ancho,
    dasharray: primerPadre ? undefined : '5 4',
  };
}

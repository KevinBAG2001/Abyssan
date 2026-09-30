// Austria: Utilidades puras para análisis del grafo de commits (Fase 4.4 / bloque G)
// Sin dependencias de React ni de red. Solo operaciones sobre arrays de commits.

import type { GitCommit } from '../types/git';
import { COLOR_RAMA_DEFECTO, COLORES_RAMA_GRAFO } from './tokens-grafo';

/**
 * Construye un mapa de hijos: hash → hashes de commits que lo tienen como padre.
 */
export function construirMapaHijos(commits: GitCommit[]): Map<string, string[]> {
  const hijos = new Map<string, string[]>();
  for (const c of commits) {
    for (const p of c.parents) {
      const lista = hijos.get(p);
      if (lista) lista.push(c.hash);
      else hijos.set(p, [c.hash]);
    }
  }
  return hijos;
}

/**
 * Devuelve todos los ancestros de un commit (caminando por parents).
 * Solo dentro del grafo cargado.
 */
export function obtenerAncestros(hash: string, commits: GitCommit[]): Set<string> {
  const indicePor = new Map<string, GitCommit>();
  for (const c of commits) indicePor.set(c.hash, c);

  const ancestros = new Set<string>();
  const cola: string[] = [];

  const inicio = indicePor.get(hash);
  if (!inicio) return ancestros;

  for (const p of inicio.parents) {
    if (indicePor.has(p)) cola.push(p);
  }

  while (cola.length > 0) {
    const actual = cola.pop()!;
    if (ancestros.has(actual)) continue;
    ancestros.add(actual);
    const commit = indicePor.get(actual);
    if (commit) {
      for (const p of commit.parents) {
        if (indicePor.has(p) && !ancestros.has(p)) cola.push(p);
      }
    }
  }
  return ancestros;
}

/**
 * Devuelve todos los descendientes de un commit (caminando por hijos).
 * Solo dentro del grafo cargado.
 */
export function obtenerDescendientes(hash: string, commits: GitCommit[]): Set<string> {
  const hijos = construirMapaHijos(commits);
  const descendientes = new Set<string>();
  const cola: string[] = hijos.get(hash) ?? [];

  while (cola.length > 0) {
    const actual = cola.pop()!;
    if (descendientes.has(actual)) continue;
    descendientes.add(actual);
    const hijosDeActual = hijos.get(actual);
    if (hijosDeActual) {
      for (const h of hijosDeActual) {
        if (!descendientes.has(h)) cola.push(h);
      }
    }
  }
  return descendientes;
}

/**
 * Encuentra el camino (BFS) entre dos commits en el grafo.
 * Busca en ambas direcciones (padres e hijos).
 * Devuelve el set de hashes en el camino, o vacío si no hay conexión.
 */
export function encontrarCamino(hashA: string, hashB: string, commits: GitCommit[]): Set<string> {
  const indicePor = new Map<string, GitCommit>();
  for (const c of commits) indicePor.set(c.hash, c);

  if (!indicePor.has(hashA) || !indicePor.has(hashB)) return new Set();
  if (hashA === hashB) return new Set([hashA]);

  const hijos = construirMapaHijos(commits);

  // BFS bidireccional: construir vecinos (padres + hijos)
  function vecinos(hash: string): string[] {
    const resultado: string[] = [];
    const commit = indicePor.get(hash);
    if (commit) {
      for (const p of commit.parents) {
        if (indicePor.has(p)) resultado.push(p);
      }
    }
    const h = hijos.get(hash);
    if (h) {
      for (const hijo of h) {
        if (indicePor.has(hijo)) resultado.push(hijo);
      }
    }
    return resultado;
  }

  // BFS desde A
  const visitadoDesdeA = new Map<string, string | null>();
  visitadoDesdeA.set(hashA, null);
  const colaA: string[] = [hashA];

  const visitadoDesdeB = new Map<string, string | null>();
  visitadoDesdeB.set(hashB, null);
  const colaB: string[] = [hashB];

  function reconstruirCamino(punto: string): Set<string> {
    const camino = new Set<string>();
    // Desde A hasta punto
    let cur: string | null = punto;
    while (cur !== null) {
      camino.add(cur);
      cur = visitadoDesdeA.get(cur) ?? null;
    }
    // Desde B hasta punto
    cur = visitadoDesdeB.get(punto) ?? null;
    while (cur !== null) {
      camino.add(cur);
      cur = visitadoDesdeB.get(cur) ?? null;
    }
    return camino;
  }

  while (colaA.length > 0 || colaB.length > 0) {
    // Expandir desde A
    if (colaA.length > 0) {
      const tamano = colaA.length;
      for (let i = 0; i < tamano; i++) {
        const actual = colaA.shift()!;
        for (const v of vecinos(actual)) {
          if (visitadoDesdeB.has(v)) {
            visitadoDesdeA.set(v, actual);
            return reconstruirCamino(v);
          }
          if (!visitadoDesdeA.has(v)) {
            visitadoDesdeA.set(v, actual);
            colaA.push(v);
          }
        }
      }
    }
    // Expandir desde B
    if (colaB.length > 0) {
      const tamano = colaB.length;
      for (let i = 0; i < tamano; i++) {
        const actual = colaB.shift()!;
        for (const v of vecinos(actual)) {
          if (visitadoDesdeA.has(v)) {
            visitadoDesdeB.set(v, actual);
            return reconstruirCamino(v);
          }
          if (!visitadoDesdeB.has(v)) {
            visitadoDesdeB.set(v, actual);
            colaB.push(v);
          }
        }
      }
    }
  }

  return new Set();
}

/**
 * Encuentra los commits que pertenecen a una rama específica
 * (desde su tip hasta el merge-base con la rama principal).
 */
export function commitsDeLaRama(
  ramaTip: string,
  mergeBaseHash: string | null,
  commits: GitCommit[],
): Set<string> {
  if (!mergeBaseHash) {
    // Sin merge-base, devuelve los ancestros del tip
    const ancestros = obtenerAncestros(ramaTip, commits);
    ancestros.add(ramaTip);
    return ancestros;
  }

  const indicePor = new Map<string, GitCommit>();
  for (const c of commits) indicePor.set(c.hash, c);

  const resultado = new Set<string>();
  const cola: string[] = [ramaTip];

  while (cola.length > 0) {
    const actual = cola.pop()!;
    if (resultado.has(actual)) continue;
    resultado.add(actual);
    if (actual === mergeBaseHash) continue; // No cruzar más allá del merge-base
    const commit = indicePor.get(actual);
    if (commit) {
      for (const p of commit.parents) {
        if (indicePor.has(p) && !resultado.has(p)) cola.push(p);
      }
    }
  }
  return resultado;
}

/**
 * Extrae la lista de autores únicos de los commits.
 */
export function autoresUnicos(commits: GitCommit[]): string[] {
  const set = new Set<string>();
  for (const c of commits) {
    if (c.authorName) set.add(c.authorName);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Extrae las ramas únicas visibles en los commits.
 */
export function ramasUnicas(commits: GitCommit[]): string[] {
  const set = new Set<string>();
  for (const c of commits) {
    c.branches?.forEach((b) => set.add(b));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** True si `%D` del commit incluye HEAD (rama actual o detached). */
export function esCommitHead(commit: GitCommit): boolean {
  return (commit.refs ?? []).some((ref) => ref === 'HEAD' || ref.startsWith('HEAD ->'));
}

/** True si la etiqueta es un tracking branch de un remoto conocido. */
export function esRefRemota(nombre: string, nombresRemotos: string[]): boolean {
  if (!nombre) return false;
  const normalizado = nombre.replace(/^remotes\//, '');
  if (nombre.startsWith('remotes/')) return true;
  return nombresRemotos.some((remoto) => normalizado === remoto || normalizado.startsWith(`${remoto}/`));
}

export type CommitConLane = GitCommit & { column: number; color: string };

export type AristaGrafo = {
  hijo: string;
  padre: string;
  primerPadre: boolean;
};

/** Color estable por nombre de rama. El índice de paleta no es la columna. */
export function colorDeSemilla(semilla: string): string {
  let hash = 2166136261;
  for (let i = 0; i < semilla.length; i++) {
    hash ^= semilla.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return COLORES_RAMA_GRAFO[(hash >>> 0) % COLORES_RAMA_GRAFO.length] ?? COLOR_RAMA_DEFECTO;
}

function semillaDeCommit(commit: GitCommit): string {
  const local = commit.branches?.find((rama) => !rama.includes('/'));
  if (local) return local;
  if (commit.branches && commit.branches.length > 0) return commit.branches[0];
  return commit.hash.slice(0, 8);
}

/**
 * Asigna columnas del DAG en orden del log (más nuevo primero).
 * Reutiliza una columna cuando su reserva ya se consumió.
 * No envuelve el índice con el tamaño de la paleta: el color y la columna van aparte.
 */
export function asignarLanes(commits: GitCommit[]): CommitConLane[] {
  const columnas: Array<string | null> = [];
  const colores: string[] = [];
  const columnaDe = new Map<string, number>();

  const reservar = (hash: string, semilla: string): number => {
    const existente = columnaDe.get(hash);
    if (existente !== undefined) return existente;
    let idx = columnas.indexOf(null);
    if (idx === -1) {
      idx = columnas.length;
      columnas.push(hash);
    } else {
      columnas[idx] = hash;
    }
    columnaDe.set(hash, idx);
    colores[idx] = colorDeSemilla(semilla);
    return idx;
  };

  const liberar = (idx: number) => {
    const actual = columnas[idx];
    if (actual) columnaDe.delete(actual);
    columnas[idx] = null;
  };

  const ocupar = (idx: number, hash: string) => {
    const actual = columnas[idx];
    if (actual && actual !== hash) columnaDe.delete(actual);
    columnas[idx] = hash;
    columnaDe.set(hash, idx);
  };

  return commits.map((commit) => {
    const semilla = semillaDeCommit(commit);
    let col = columnaDe.get(commit.hash);
    if (col === undefined) col = reservar(commit.hash, semilla);

    const padrePrincipal = commit.parents[0];
    if (!padrePrincipal) {
      liberar(col);
    } else {
      const columnaPadre = columnaDe.get(padrePrincipal);
      if (columnaPadre === undefined) ocupar(col, padrePrincipal);
      else if (columnaPadre !== col) liberar(col);
    }

    for (let i = 1; i < commit.parents.length; i++) {
      const padre = commit.parents[i];
      if (!columnaDe.has(padre)) reservar(padre, `${semilla}~${i}`);
    }

    return {
      ...commit,
      column: col,
      color: colores[col] || COLOR_RAMA_DEFECTO,
    };
  });
}

/**
 * Aristas cuyo segmento de filas cruza la ventana virtualizada.
 * Recorre cada commit una vez (O(n)), no pares de nodos.
 */
export function aristasQueCruzanVentana(
  commits: Array<Pick<GitCommit, 'hash' | 'parents'>>,
  inicio: number,
  fin: number,
): AristaGrafo[] {
  const indice = new Map<string, number>();
  for (let i = 0; i < commits.length; i++) indice.set(commits[i].hash, i);

  const aristas: AristaGrafo[] = [];
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    for (let p = 0; p < commit.parents.length; p++) {
      const padre = commit.parents[p];
      const iPadre = indice.get(padre);
      if (iPadre === undefined) continue;
      const lo = i < iPadre ? i : iPadre;
      const hi = i < iPadre ? iPadre : i;
      if (hi >= inicio && lo < fin) {
        aristas.push({ hijo: commit.hash, padre, primerPadre: p === 0 });
      }
    }
  }
  return aristas;
}

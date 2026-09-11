// Austria: Utilidades puras para análisis del grafo de commits (Fase 4.4)
// Sin dependencias de React ni de red. Solo operaciones sobre arrays de commits.

import type { GitCommit } from '../types/git';

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

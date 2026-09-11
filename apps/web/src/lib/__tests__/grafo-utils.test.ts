import { describe, it, expect } from 'vitest';
import {
  construirMapaHijos,
  obtenerAncestros,
  obtenerDescendientes,
  encontrarCamino,
  commitsDeLaRama,
  autoresUnicos,
  ramasUnicas,
} from '../grafo-utils';
import type { GitCommit } from '../../types/git';

function commit(hash: string, parents: string[], extra?: Partial<GitCommit>): GitCommit {
  return {
    hash,
    shortHash: hash.substring(0, 7),
    parents,
    authorName: extra?.authorName ?? 'Dev',
    authorEmail: 'dev@test.com',
    date: '2026-01-01',
    message: extra?.message ?? `Commit ${hash}`,
    branches: extra?.branches,
    tags: extra?.tags,
  };
}

// Grafo de ejemplo:
//   A ← B ← D (main)
//        ↖ C ← E (feature)
//   merge-base de D y E es B
const GRAFO: GitCommit[] = [
  commit('eeeee', ['ccccc'], { branches: ['feature'] }),
  commit('ddddd', ['bbbbb'], { branches: ['main'] }),
  commit('ccccc', ['bbbbb']),
  commit('bbbbb', ['aaaaa']),
  commit('aaaaa', [], { authorName: 'Otro' }),
];

describe('construirMapaHijos', () => {
  it('construye relaciones de hijos correctamente', () => {
    const hijos = construirMapaHijos(GRAFO);
    expect(hijos.get('bbbbb')).toEqual(expect.arrayContaining(['ddddd', 'ccccc']));
    expect(hijos.get('ccccc')).toEqual(['eeeee']);
    expect(hijos.get('aaaaa')).toEqual(['bbbbb']);
    expect(hijos.has('eeeee')).toBe(false);
    expect(hijos.has('ddddd')).toBe(false);
  });
});

describe('obtenerAncestros', () => {
  it('devuelve ancestros de E (feature tip)', () => {
    const anc = obtenerAncestros('eeeee', GRAFO);
    expect(anc.has('ccccc')).toBe(true);
    expect(anc.has('bbbbb')).toBe(true);
    expect(anc.has('aaaaa')).toBe(true);
    expect(anc.has('eeeee')).toBe(false); // No se incluye a sí mismo
    expect(anc.has('ddddd')).toBe(false); // D no es ancestro de E
  });

  it('devuelve vacío para commit raíz', () => {
    const anc = obtenerAncestros('aaaaa', GRAFO);
    expect(anc.size).toBe(0);
  });

  it('devuelve vacío para hash inexistente', () => {
    const anc = obtenerAncestros('zzzzz', GRAFO);
    expect(anc.size).toBe(0);
  });
});

describe('obtenerDescendientes', () => {
  it('devuelve descendientes de B', () => {
    const desc = obtenerDescendientes('bbbbb', GRAFO);
    expect(desc.has('ccccc')).toBe(true);
    expect(desc.has('ddddd')).toBe(true);
    expect(desc.has('eeeee')).toBe(true);
    expect(desc.has('bbbbb')).toBe(false); // No se incluye a sí mismo
    expect(desc.has('aaaaa')).toBe(false); // A es padre, no hijo
  });

  it('devuelve vacío para leaf (tip)', () => {
    const desc = obtenerDescendientes('eeeee', GRAFO);
    expect(desc.size).toBe(0);
  });
});

describe('encontrarCamino', () => {
  it('encuentra camino entre D y E pasando por B', () => {
    const camino = encontrarCamino('ddddd', 'eeeee', GRAFO);
    expect(camino.has('ddddd')).toBe(true);
    expect(camino.has('eeeee')).toBe(true);
    expect(camino.has('bbbbb')).toBe(true);
    expect(camino.has('ccccc')).toBe(true);
    expect(camino.has('aaaaa')).toBe(false); // No es parte del camino mínimo
  });

  it('mismo commit devuelve set con un elemento', () => {
    const camino = encontrarCamino('bbbbb', 'bbbbb', GRAFO);
    expect(camino.size).toBe(1);
    expect(camino.has('bbbbb')).toBe(true);
  });

  it('hashes inexistentes devuelve vacío', () => {
    const camino = encontrarCamino('xxxxx', 'yyyyy', GRAFO);
    expect(camino.size).toBe(0);
  });

  it('camino directo padre-hijo', () => {
    const camino = encontrarCamino('aaaaa', 'bbbbb', GRAFO);
    expect(camino.has('aaaaa')).toBe(true);
    expect(camino.has('bbbbb')).toBe(true);
    expect(camino.size).toBe(2);
  });
});

describe('commitsDeLaRama', () => {
  it('devuelve commits desde tip hasta merge-base', () => {
    const resultado = commitsDeLaRama('eeeee', 'bbbbb', GRAFO);
    expect(resultado.has('eeeee')).toBe(true);
    expect(resultado.has('ccccc')).toBe(true);
    expect(resultado.has('bbbbb')).toBe(true); // El merge-base se incluye
    expect(resultado.has('aaaaa')).toBe(false); // Más allá del merge-base
    expect(resultado.has('ddddd')).toBe(false); // Otra rama
  });

  it('sin merge-base devuelve todos los ancestros + tip', () => {
    const resultado = commitsDeLaRama('eeeee', null, GRAFO);
    expect(resultado.has('eeeee')).toBe(true);
    expect(resultado.has('ccccc')).toBe(true);
    expect(resultado.has('bbbbb')).toBe(true);
    expect(resultado.has('aaaaa')).toBe(true);
  });
});

describe('autoresUnicos', () => {
  it('extrae autores sin duplicados', () => {
    const autores = autoresUnicos(GRAFO);
    expect(autores).toContain('Dev');
    expect(autores).toContain('Otro');
    expect(autores.length).toBe(2);
  });

  it('está ordenado alfabéticamente', () => {
    const autores = autoresUnicos(GRAFO);
    expect(autores[0]).toBe('Dev');
    expect(autores[1]).toBe('Otro');
  });
});

describe('ramasUnicas', () => {
  it('extrae ramas de los commits', () => {
    const ramas = ramasUnicas(GRAFO);
    expect(ramas).toContain('main');
    expect(ramas).toContain('feature');
    expect(ramas.length).toBe(2);
  });
});

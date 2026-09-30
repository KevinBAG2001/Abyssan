import { describe, it, expect } from 'vitest';
import {
  construirMapaHijos,
  obtenerAncestros,
  obtenerDescendientes,
  encontrarCamino,
  commitsDeLaRama,
  autoresUnicos,
  ramasUnicas,
  esCommitHead,
  esRefRemota,
  asignarLanes,
  aristasQueCruzanVentana,
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
    refs: extra?.refs,
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

describe('esCommitHead', () => {
  it('usa la ref HEAD, no el índice 0 del listado', () => {
    const headViejo = commit('aaaaa', [], { refs: ['HEAD -> main'] });
    const masNuevo = commit('eeeee', ['ccccc'], { refs: ['feature'], branches: ['feature'] });
    expect(esCommitHead(headViejo)).toBe(true);
    expect(esCommitHead(masNuevo)).toBe(false);
    expect(esCommitHead(commit('bbbbb', ['aaaaa']))).toBe(false);
  });

  it('detecta HEAD desvinculado', () => {
    expect(esCommitHead(commit('ccccc', ['bbbbb'], { refs: ['HEAD'] }))).toBe(true);
  });
});

describe('asignarLanes', () => {
  it('mantiene la columna del primer padre y abre otra para el merge', () => {
    const lanes = asignarLanes(GRAFO);
    const col = (hash: string) => lanes.find((c) => c.hash === hash)?.column;
    expect(col('eeeee')).toBe(col('ccccc'));
    expect(col('ddddd')).toBe(col('bbbbb'));
    expect(col('eeeee')).not.toBe(col('ddddd'));
    expect(lanes.every((c) => typeof c.color === 'string' && c.color.length > 0)).toBe(true);
  });

  it('reutiliza la columna libre de más a la izquierda', () => {
    const lanes = asignarLanes([
      commit('c1ccc', ['c2ccc']),
      commit('d1ddd', ['d2ddd']),
      commit('c2ccc', []),
      commit('d2ddd', []),
      commit('e1eee', []),
    ]);
    const col = (hash: string) => lanes.find((c) => c.hash === hash)?.column;
    expect(col('c1ccc')).toBe(0);
    expect(col('d1ddd')).toBe(1);
    expect(col('e1eee')).toBe(0);
  });

  it('no envuelve la columna al tamaño de la paleta', () => {
    const puntas = Array.from({ length: 8 }, (_, i) =>
      commit(`t${i}ttt`, [`p${i}ppp`]),
    );
    const padres = Array.from({ length: 8 }, (_, i) => commit(`p${i}ppp`, []));
    const lanes = asignarLanes([...puntas, ...padres]);
    const columnasPuntas = new Set(puntas.map((p) => lanes.find((c) => c.hash === p.hash)?.column));
    expect(columnasPuntas.size).toBe(8);
  });
});

describe('aristasQueCruzanVentana', () => {
  it('incluye la arista que entra en la ventana y omite las que quedan fuera', () => {
    const lineal = Array.from({ length: 30 }, (_, i) =>
      commit(`c${String(i).padStart(2, '0')}`, i < 29 ? [`c${String(i + 1).padStart(2, '0')}`] : []),
    );
    const aristas = aristasQueCruzanVentana(lineal, 10, 20);
    expect(aristas.some((a) => a.hijo === 'c09' && a.padre === 'c10')).toBe(true);
    expect(aristas.some((a) => a.hijo === 'c00' && a.padre === 'c01')).toBe(false);
    expect(aristas.some((a) => a.hijo === 'c25' && a.padre === 'c26')).toBe(false);
    expect(aristas.every((a) => a.primerPadre)).toBe(true);
  });
});

describe('esRefRemota', () => {
  it('distingue origin/main de una rama local con barra', () => {
    expect(esRefRemota('origin/main', ['origin'])).toBe(true);
    expect(esRefRemota('remotes/origin/main', ['origin'])).toBe(true);
    expect(esRefRemota('feature/login', ['origin'])).toBe(false);
    expect(esRefRemota('main', ['origin'])).toBe(false);
  });
});

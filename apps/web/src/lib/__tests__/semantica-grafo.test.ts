import { describe, expect, it } from 'vitest';
import type { GitCommit } from '../../types/git';
import { asignarLanes, aristasQueCruzanVentana } from '../grafo-utils';
import {
  estiloAristaSemantica,
  exclusivosHastaBase,
  familiaDeCommit,
  INTELIGENCIA_GRAFO_VACIA,
  marcasDeCommit,
  relacionConHead,
  resolverSemanticaGrafo,
  textoMarcas,
  textoRelacion,
  ubicarRecuperacion,
} from '../semantica-grafo';

function commit(hash: string, parents: string[], extra?: Partial<GitCommit>): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    authorName: 'Dev',
    authorEmail: 'dev@test.com',
    date: '2026-01-01T00:00:00.000Z',
    message: extra?.message ?? `Commit ${hash}`,
    branches: extra?.branches,
    tags: extra?.tags,
    refs: extra?.refs,
  };
}

// A ← B ← D (main, HEAD) ; B ← C (origin/main)
// merge-base(main, origin/main) = B
const HISTORIA: GitCommit[] = [
  commit('ddddddd', ['bbbbbbb'], { branches: ['main'], refs: ['HEAD -> main'] }),
  commit('ccccccc', ['bbbbbbb'], { branches: ['origin/main'] }),
  commit('bbbbbbb', ['aaaaaaa']),
  commit('aaaaaaa', []),
];

const entradaBase = {
  ...INTELIGENCIA_GRAFO_VACIA,
  commits: HISTORIA,
  ramaActual: 'main',
  tracking: 'origin/main',
  ahead: 1,
  behind: 1,
  puntas: [
    { nombre: 'main', hash: 'ddddddd', actual: true, remota: false },
    { nombre: 'remotes/origin/main', hash: 'ccccccc', actual: false, remota: true },
  ],
  mergeBaseUpstream: 'bbbbbbb',
  mergeBaseSeleccion: null,
  mergeBaseUpstreamResuelto: true,
  mergeBaseSeleccionResuelto: false,
};

describe('resolverSemanticaGrafo', () => {
  it('marca HEAD, salientes, entrantes y merge-base sin incluir la base en ahead/behind', () => {
    const sem = resolverSemanticaGrafo(entradaBase);
    expect(sem.resumen.hashHead).toBe('ddddddd');
    expect(sem.salientes.has('ddddddd')).toBe(true);
    expect(sem.salientes.has('bbbbbbb')).toBe(false);
    expect(sem.entrantes.has('ccccccc')).toBe(true);
    expect(sem.entrantes.has('bbbbbbb')).toBe(false);
    expect(sem.bases.has('bbbbbbb')).toBe(true);
    expect(sem.resumen.ventanaIncompleta).toBe(false);
    expect(sem.resumen.ahead).toBe(1);
    expect(sem.resumen.behind).toBe(1);

    const head = marcasDeCommit('ddddddd', sem);
    expect(head.head).toBe(true);
    expect(head.saliente).toBe(true);
    expect(textoMarcas(head)).toContain('HEAD');
    expect(textoMarcas(marcasDeCommit('bbbbbbb', sem))).toContain('merge-base');
  });

  it('calcula ahead/behind con las dos puntas aunque el merge-base todavía no llegue', () => {
    const sem = resolverSemanticaGrafo({
      ...entradaBase,
      mergeBaseUpstream: null,
      mergeBaseUpstreamResuelto: false,
    });
    expect(sem.salientes.has('ddddddd')).toBe(true);
    expect(sem.entrantes.has('ccccccc')).toBe(true);
    expect(sem.bases.size).toBe(0);
    expect(sem.resumen.ventanaIncompleta).toBe(false);
  });

  it('no marca como saliente un commit que ya está en el upstream tras un merge', () => {
    const commits = [
      commit('mmmmmmm', ['ddddddd', 'ccccccc'], { branches: ['main'], refs: ['HEAD -> main'] }),
      commit('ddddddd', ['bbbbbbb']),
      commit('ccccccc', ['bbbbbbb'], { branches: ['origin/main'] }),
      commit('bbbbbbb', ['aaaaaaa']),
      commit('aaaaaaa', []),
    ];
    const sem = resolverSemanticaGrafo({
      ...entradaBase,
      commits,
      ahead: 2,
      behind: 0,
      puntas: [
        { nombre: 'main', hash: 'mmmmmmm', actual: true, remota: false },
        { nombre: 'origin/main', hash: 'ccccccc', actual: false, remota: true },
      ],
      mergeBaseUpstream: 'bbbbbbb',
    });
    expect(sem.salientes.has('mmmmmmm')).toBe(true);
    expect(sem.salientes.has('ddddddd')).toBe(true);
    expect(sem.salientes.has('ccccccc')).toBe(false);
    expect(sem.entrantes.size).toBe(0);
  });

  it('avisa si el ahead no cabe en el log cargado', () => {
    const sem = resolverSemanticaGrafo({
      ...entradaBase,
      commits: [HISTORIA[0]],
      mergeBaseUpstream: 'bbbbbbb',
      ahead: 4,
      behind: 0,
    });
    expect(sem.salientes.size).toBe(0);
    expect(sem.resumen.ventanaIncompleta).toBe(true);
  });

  it('integra preview y recuperación cuando el journal nombra un hash', () => {
    const sem = resolverSemanticaGrafo({
      ...entradaBase,
      previewActivo: true,
      seguroEjecutar: false,
      hashesPreview: ['ccccccc'],
      hashBasePreview: 'bbbbbbb',
      advertenciasPreview: ['Puede haber conflictos.'],
      textosRecuperacion: ['HEAD estaba en aaaaaaa'],
    });
    expect(sem.preview.has('ccccccc')).toBe(true);
    expect(sem.recuperacion.get('aaaaaaa')).toContain('aaaaaaa');
    expect(sem.resumen.recuperables).toBe(1);
    expect(sem.resumen.advertencias).toContain('Puede haber conflictos.');
    expect(sem.resumen.advertencias.some((a) => a.includes('no segura'))).toBe(true);
  });

  it('no marca recuperación ambigua ni rutas con hex suelto', () => {
    const commits = [
      commit('aaa1111aaaa', []),
      commit('aaa1112bbbb', []),
    ];
    expect(ubicarRecuperacion(commits, ['HEAD estaba en aaa111']).size).toBe(0);
    expect(ubicarRecuperacion(commits, ['Working tree con cambios en src/aaa1111aaaa/nota.txt']).size).toBe(0);
    expect(ubicarRecuperacion(commits, ['HEAD estaba en aaa1111aaaa']).get('aaa1111aaaa')).toBeTruthy();
  });

  it('describe la relación con HEAD y la familia', () => {
    expect(relacionConHead('ddddddd', 'ddddddd', HISTORIA)).toBe('es-head');
    expect(relacionConHead('bbbbbbb', 'ddddddd', HISTORIA)).toBe('ancestro');
    expect(relacionConHead('ccccccc', 'ddddddd', HISTORIA)).toBe('otro');
    expect(textoRelacion('ancestro')).toContain('ancestro');

    const familia = familiaDeCommit('bbbbbbb', HISTORIA);
    expect(familia.padres.map((p) => p.hash)).toEqual(['aaaaaaa']);
    expect(familia.hijos.map((h) => h.hash).sort()).toEqual(['ccccccc', 'ddddddd']);
    expect(familia.padres[0].enGrafo).toBe(true);
  });

  it('pinta salientes, entrantes y merges sin animar el resto', () => {
    const sem = resolverSemanticaGrafo(entradaBase);
    const saliente = estiloAristaSemantica('ddddddd', true, sem, 'var(--color-ion)');
    expect(saliente.stroke).toBe('var(--color-ember)');
    expect(saliente.dasharray).toBeUndefined();
    const entrante = estiloAristaSemantica('ccccccc', true, sem, 'var(--color-ion)');
    expect(entrante.stroke).toBe('var(--color-secondary)');
    const merge = estiloAristaSemantica('zzzzzzz', false, sem, 'var(--color-ion)');
    expect(merge.stroke).toBe('var(--color-ion)');
    expect(merge.dasharray).toBe('5 4');
  });
});

describe('rendimiento del grafo', () => {
  it('layout, semántica y aristas de 4000 commits se resuelven en tiempo lineal', () => {
    const n = 4000;
    const commits: GitCommit[] = [];
    for (let i = 0; i < n; i++) {
      const hash = `c${String(i).padStart(5, '0')}cafe`;
      const padre = i < n - 1 ? `c${String(i + 1).padStart(5, '0')}cafe` : null;
      commits.push(
        commit(hash, padre ? [padre] : [], i === 0 ? { branches: ['main'], refs: ['HEAD -> main'] } : undefined),
      );
    }
    const base = commits[20].hash;
    const t0 = performance.now();
    const lanes = asignarLanes(commits);
    const sem = resolverSemanticaGrafo({
      ...entradaBase,
      commits,
      ahead: 20,
      behind: 0,
      puntas: [{ nombre: 'main', hash: commits[0].hash, actual: true, remota: false }],
      tracking: 'origin/main',
      mergeBaseUpstream: base,
      mergeBaseUpstreamResuelto: true,
    });
    const aristas = aristasQueCruzanVentana(lanes, 100, 140);
    const ms = performance.now() - t0;
    expect(lanes).toHaveLength(n);
    expect(lanes[0].column).toBe(0);
    expect(lanes[10].column).toBe(0);
    expect(sem.salientes.size).toBe(20);
    expect(sem.salientes.has(base)).toBe(false);
    expect(aristas.length).toBeGreaterThan(0);
    expect(aristas.length).toBeLessThan(80);
    expect(ms).toBeLessThan(250);
  });
});

describe('exclusivosHastaBase', () => {
  it('devuelve vacío si la base no es ancestro en la ventana', () => {
    const r = exclusivosHastaBase('ddddddd', 'ccccccc', HISTORIA);
    expect(r.baseVisible).toBe(false);
    expect(r.hashes.size).toBe(0);
  });
});

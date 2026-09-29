import { describe, it, expect } from 'vitest';
import { extraerConflictosMergeTree } from '../extraerConflictosMergeTree.js';

describe('extraerConflictosMergeTree', () => {
  it('extrae rutas de un bloque changed in both', () => {
    const salida = [
      'changed in both',
      '  base   100644 4b825d5ceefa archivo.txt',
      '  our    100644 abcdef123456 archivo.txt',
      '  their  100644 fedcba654321 archivo.txt',
      '<<<<<<< .our',
      'main',
      '=======',
      'otra',
      '>>>>>>> .their',
    ].join('\n');
    expect(extraerConflictosMergeTree(salida)).toEqual(['archivo.txt']);
  });

  it('no marca un merge limpio como conflicto', () => {
    const salida = [
      'merged',
      '  result 100644 abcdef123456 nuevo.txt',
      '  our    100644 abcdef123456 nuevo.txt',
    ].join('\n');
    expect(extraerConflictosMergeTree(salida)).toEqual([]);
  });

  it('extrae la ruta de una línea CONFLICT', () => {
    const salida = 'CONFLICT (content): Merge conflict in src/app.ts';
    expect(extraerConflictosMergeTree(salida)).toEqual(['src/app.ts']);
  });
});

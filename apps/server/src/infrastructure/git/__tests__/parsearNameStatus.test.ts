import { describe, expect, it } from 'vitest';
import { parsearNameStatus } from '../parsearNameStatus.js';

describe('parsearNameStatus', () => {
  it('clasifica A/M/D', () => {
    const archivos = parsearNameStatus('A\tnuevo.ts\nM\tREADME.md\nD\tviejo.ts\n');
    expect(archivos).toEqual([
      { path: 'nuevo.ts', status: 'added' },
      { path: 'README.md', status: 'modified' },
      { path: 'viejo.ts', status: 'deleted' },
    ]);
  });

  it('detecta renombres con path anterior', () => {
    const archivos = parsearNameStatus('R100\tantiguo.ts\tnuevo.ts\n');
    expect(archivos).toEqual([{ path: 'nuevo.ts', status: 'renamed', pathAnterior: 'antiguo.ts' }]);
  });
});

import { describe, expect, it } from 'vitest';
import type { FileStatusResult } from 'simple-git';
import { mapearEstadoPorcelain } from '../mapearEstadoPorcelain.js';

function fila(path: string, index: string, working_dir: string): FileStatusResult {
  return { path, index, working_dir };
}

describe('mapearEstadoPorcelain', () => {
  it('un modificado solo en el índice no se duplica como sin preparar', () => {
    const files = mapearEstadoPorcelain([fila('apps/web/src/a.ts', 'M', ' ')], []);
    expect(files).toEqual([{ path: 'apps/web/src/a.ts', status: 'modified', staged: true }]);
  });

  it('un modificado solo en el working tree aparece una vez sin preparar', () => {
    const files = mapearEstadoPorcelain([fila('README.md', ' ', 'M')], []);
    expect(files).toEqual([{ path: 'README.md', status: 'modified', staged: false }]);
  });

  it('MM es el mismo archivo en preparados y en sin preparar (2 filas, no 3+)', () => {
    const files = mapearEstadoPorcelain([fila('SECURITY.md', 'M', 'M')], []);
    expect(files).toHaveLength(2);
    expect(files.filter((f) => f.path === 'SECURITY.md')).toHaveLength(2);
    expect(files.some((f) => f.staged)).toBe(true);
    expect(files.some((f) => !f.staged)).toBe(true);
  });

  it('un archivo nuevo preparado no se lista dos veces (created+staged)', () => {
    const files = mapearEstadoPorcelain([fila('nuevo.ts', 'A', ' ')], []);
    expect(files).toEqual([{ path: 'nuevo.ts', status: 'added', staged: true }]);
  });

  it('noTracked no duplica un untracked ya presente en porcelain', () => {
    const files = mapearEstadoPorcelain([fila('tmp.log', '?', '?')], ['tmp.log', 'otro.log']);
    expect(files.filter((f) => f.path === 'tmp.log')).toHaveLength(1);
    expect(files.some((f) => f.path === 'otro.log' && f.status === 'untracked')).toBe(true);
  });
});

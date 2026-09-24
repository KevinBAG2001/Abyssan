import { describe, expect, it } from 'vitest';
import {
  clasificarOperacion,
  OPERACIONES_EXCLUSIVAS,
  OPERACIONES_LECTURA,
  RepositoryOperationLock,
  requiereExclusividad,
} from '../RepositoryOperationLock.js';

describe('RepositoryOperationLock', () => {
  it('clasifica lecturas y mutaciones pesadas', () => {
    expect(clasificarOperacion('status')).toBe('lectura');
    expect(clasificarOperacion('diff')).toBe('lectura');
    expect(clasificarOperacion('commit')).toBe('mutacion_ligera');
    expect(clasificarOperacion('pull')).toBe('mutacion_pesada');
    expect(clasificarOperacion('rebase')).toBe('mutacion_pesada');
    expect(clasificarOperacion('merge')).toBe('mutacion_pesada');
    expect(requiereExclusividad('merge')).toBe(true);
    expect(requiereExclusividad('status')).toBe(false);
    expect(OPERACIONES_EXCLUSIVAS.has('merge')).toBe(true);
    expect(OPERACIONES_LECTURA.has('diff')).toBe(true);
  });

  it('permite lecturas sin lock y serializa mutaciones del mismo repo', async () => {
    const lock = new RepositoryOperationLock();
    expect(lock.decidir('A', 'status')).toBe('permitir');
    const liberar = await lock.adquirir('A', 'pull');
    expect(lock.hayTrabajo('A')).toBe(true);
    expect(lock.decidir('A', 'rebase')).toBe('esperar');
    expect(lock.decidir('B', 'pull')).toBe('permitir');
    const otro = await lock.adquirir('B', 'pull');
    expect(lock.hayTrabajo('B')).toBe(true);
    liberar();
    otro();
    expect(lock.hayTrabajo('A')).toBe(false);
    expect(lock.hayTrabajo('B')).toBe(false);
  });

  it('espera a que termine el pull de A antes de dar el rebase de A', async () => {
    const lock = new RepositoryOperationLock();
    const orden: string[] = [];
    const liberarPull = await lock.adquirir('repo-a', 'pull');
    const rebase = lock.adquirir('repo-a', 'rebase').then((liberar) => {
      orden.push('rebase');
      liberar();
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(orden).toEqual([]);
    orden.push('pull');
    liberarPull();
    await rebase;
    expect(orden).toEqual(['pull', 'rebase']);
  });
});

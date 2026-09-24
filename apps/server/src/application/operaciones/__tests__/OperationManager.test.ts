import { describe, expect, it } from 'vitest';
import { OperationManager } from '../OperationManager.js';
import { RepositoryOperationLock } from '../RepositoryOperationLock.js';
import { RegistroOperaciones } from '../RegistroOperaciones.js';

function crearGestor() {
  const lock = new RepositoryOperationLock();
  const gestor = new OperationManager(lock, new RegistroOperaciones());
  return { lock, gestor };
}

describe('OperationManager', () => {
  it('registra operationId, estados, duración y libera el lock tras éxito', async () => {
    const { lock, gestor } = crearGestor();
    const { resultado, operacion } = await gestor.ejecutar({
      repository: '/tmp/repo-a',
      type: 'merge',
      metadata: { sourceBranch: 'feature' },
      trabajo: async () => {
        expect(lock.hayTrabajo('/tmp/repo-a')).toBe(true);
        await new Promise((r) => setTimeout(r, 15));
        return 'ok';
      },
    });

    expect(resultado).toBe('ok');
    expect(operacion.operationId).toMatch(/^[a-f0-9]+$/);
    expect(operacion.repository).toBe('/tmp/repo-a');
    expect(operacion.type).toBe('merge');
    expect(operacion.state).toBe('completed');
    expect(operacion.startedAt).toBeTruthy();
    expect(operacion.finishedAt).toBeTruthy();
    expect(operacion.duration).toBeGreaterThanOrEqual(0);
    expect(operacion.progress).toBe(100);
    expect(operacion.error).toBeUndefined();
    expect(operacion.metadata.sourceBranch).toBe('feature');
    expect(lock.hayTrabajo('/tmp/repo-a')).toBe(false);
  });

  it('marca failed, conserva el error y libera el lock tras un fallo', async () => {
    const { lock, gestor } = crearGestor();
    await expect(
      gestor.ejecutar({
        repository: '/tmp/repo-b',
        type: 'merge',
        trabajo: async () => {
          throw new Error('CONFLICT (content): merge failed');
        },
      })
    ).rejects.toThrow('CONFLICT');

    const fallida = gestor.listar().find((op) => op.repository === '/tmp/repo-b');
    expect(fallida?.state).toBe('failed');
    expect(fallida?.error).toMatch(/CONFLICT/i);
    expect(fallida?.startedAt).toBeTruthy();
    expect(fallida?.finishedAt).toBeTruthy();
    expect(fallida?.duration).toBeGreaterThanOrEqual(0);
    expect(lock.hayTrabajo('/tmp/repo-b')).toBe(false);
  });

  it('serializa mutaciones del mismo repo y no bloquea lecturas', async () => {
    const { lock, gestor } = crearGestor();
    const orden: string[] = [];

    const pesada = gestor.ejecutar({
      repository: '/tmp/repo-c',
      type: 'merge',
      trabajo: async () => {
        orden.push('merge-start');
        await new Promise((r) => setTimeout(r, 40));
        orden.push('merge-end');
      },
    });

    const lectura = gestor.ejecutar({
      repository: '/tmp/repo-c',
      type: 'status',
      trabajo: async () => {
        orden.push('status');
      },
    });

    const segunda = gestor.ejecutar({
      repository: '/tmp/repo-c',
      type: 'pull',
      trabajo: async () => {
        orden.push('pull');
      },
    });

    await Promise.all([pesada, lectura, segunda]);
    expect(orden).toContain('merge-start');
    expect(orden).toContain('status');
    expect(orden.indexOf('merge-end')).toBeLessThan(orden.indexOf('pull'));
    expect(lock.hayTrabajo('/tmp/repo-c')).toBe(false);
  });

  it('permite mutaciones en paralelo en repositorios distintos', async () => {
    const { gestor } = crearGestor();
    let concurrentes = 0;
    let max = 0;

    const trabajo = async () => {
      concurrentes += 1;
      max = Math.max(max, concurrentes);
      await new Promise((r) => setTimeout(r, 25));
      concurrentes -= 1;
    };

    await Promise.all([
      gestor.ejecutar({ repository: '/tmp/a', type: 'merge', trabajo }),
      gestor.ejecutar({ repository: '/tmp/b', type: 'merge', trabajo }),
    ]);
    expect(max).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { OperationManager } from '../OperationManager.js';
import { RepositoryOperationLock } from '../RepositoryOperationLock.js';
import { RegistroOperaciones } from '../RegistroOperaciones.js';
import { OPERACIONES_HTTP_DESACOPLADAS, vistaOperacion } from '../operacionesAsincronas.js';

function crearGestor() {
  const eventos: Record<string, unknown>[] = [];
  const lock = new RepositoryOperationLock();
  const gestor = new OperationManager(lock, new RegistroOperaciones(), (_repo, mensaje) => {
    eventos.push(mensaje);
  });
  return { lock, gestor, eventos };
}

const CLAVES_EVENTO = ['type', 'operationId', 'repository', 'operationType', 'timestamp', 'state', 'progress', 'error'];

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

  it('desacopla clone, fetch, pull, push y rebase; merge y cherry-pick siguen en la petición', () => {
    expect([...OPERACIONES_HTTP_DESACOPLADAS].sort()).toEqual(['clone', 'fetch', 'pull', 'push', 'rebase']);
    expect(OPERACIONES_HTTP_DESACOPLADAS.has('merge')).toBe(false);
    expect(OPERACIONES_HTTP_DESACOPLADAS.has('cherry-pick')).toBe(false);
  });

  it('iniciar devuelve antes de que el trabajo termine y publica el ciclo', async () => {
    const { gestor, eventos } = crearGestor();
    let termino = false;
    const op = gestor.iniciar({
      repository: '/tmp/repo-async',
      type: 'fetch',
      metadata: { url: 'https://user:ghp_supersecreto@github.com/acme/r.git' },
      trabajo: async (onProgreso) => {
        onProgreso({ etapa: 'Receiving objects', porcentaje: 40 });
        await new Promise((r) => setTimeout(r, 20));
        termino = true;
      },
    });

    expect(termino).toBe(false);
    expect(op.state === 'queued' || op.state === 'running').toBe(true);
    const final = await gestor.esperar(op.operationId);
    expect(termino).toBe(true);
    expect(final?.state).toBe('completed');
    expect(eventos.map((e) => e.type)).toEqual([
      'operation.started',
      'operation.progress',
      'operation.completed',
    ]);
    const progreso = eventos[1];
    expect(progreso).toMatchObject({
      operationId: op.operationId,
      repository: '/tmp/repo-async',
      operationType: 'fetch',
      state: 'running',
      progress: 40,
    });
    expect(progreso?.timestamp).toEqual(expect.any(String));
    for (const evento of eventos) {
      const sobrantes = Object.keys(evento).filter((clave) => !CLAVES_EVENTO.includes(clave));
      expect(sobrantes).toEqual([]);
      expect(JSON.stringify(evento)).not.toContain('ghp_supersecreto');
      expect(JSON.stringify(evento)).not.toContain('Receiving objects');
    }
    const vista = vistaOperacion(gestor.obtener(op.operationId)!);
    expect(vista).not.toHaveProperty('metadata');
    expect(JSON.stringify(vista)).not.toContain('ghp_supersecreto');
  });

  it('publica operation.failed con el error sanitizado', async () => {
    const { gestor, eventos } = crearGestor();
    const op = gestor.iniciar({
      repository: '/tmp/repo-fallo',
      type: 'push',
      trabajo: async () => {
        throw new Error('fatal: https://user:ghp_secreto@github.com/acme/r.git');
      },
    });
    const final = await gestor.esperar(op.operationId);
    expect(final?.state).toBe('failed');
    expect(final?.error).not.toContain('ghp_secreto');
    const fallo = eventos.find((e) => e.type === 'operation.failed');
    expect(fallo).toMatchObject({
      operationId: op.operationId,
      repository: '/tmp/repo-fallo',
      operationType: 'push',
      state: 'failed',
    });
    expect(String(fallo?.error)).not.toContain('ghp_secreto');
  });

  it('cancela solo la operación en cola y emite operation.cancelled', async () => {
    const { gestor, eventos } = crearGestor();
    let corrioLaSegunda = false;
    const primera = gestor.iniciar({
      repository: '/tmp/repo-cancel',
      type: 'merge',
      trabajo: async () => {
        await new Promise((r) => setTimeout(r, 40));
      },
    });
    await expect.poll(() => gestor.obtener(primera.operationId)?.state).toBe('running');
    const segunda = gestor.iniciar({
      repository: '/tmp/repo-cancel',
      type: 'pull',
      trabajo: async () => {
        corrioLaSegunda = true;
      },
    });

    expect(segunda.state).toBe('queued');
    expect(gestor.cancelar(segunda.operationId)).toBe(true);
    expect(gestor.cancelar(primera.operationId)).toBe(false);

    await gestor.esperar(primera.operationId);
    await gestor.esperar(segunda.operationId);
    expect(corrioLaSegunda).toBe(false);
    expect(gestor.obtener(primera.operationId)?.state).toBe('completed');
    expect(gestor.obtener(segunda.operationId)?.state).toBe('cancelled');
    const cancelada = eventos.find((e) => e.operationId === segunda.operationId && e.type === 'operation.cancelled');
    expect(cancelada).toMatchObject({
      repository: '/tmp/repo-cancel',
      operationType: 'pull',
      state: 'cancelled',
    });
    expect(cancelada).not.toHaveProperty('error');
  });
});

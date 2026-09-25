import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response } from 'express';
import { GitController } from '../controllers/GitController.js';
import type { GitUseCases } from '../../../application/use-cases/GitUseCases.js';
import type { VistaOperacion } from '../../../application/operaciones/operacionesAsincronas.js';

function respuesta() {
  return {
    codigo: 200,
    cuerpo: undefined as { exito?: boolean; mensaje?: string; datos?: unknown } | undefined,
    status(codigo: number) {
      this.codigo = codigo;
      return this;
    },
    json(cuerpo: { exito?: boolean; mensaje?: string; datos?: unknown }) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

describe('HTTP de operaciones largas', () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz = '';

  afterEach(() => {
    if (raiz) fs.rmSync(raiz, { recursive: true, force: true });
    raiz = '';
    if (raizOriginal !== undefined) process.env.PROJECTS_ROOT = raizOriginal;
    else delete process.env.PROJECTS_ROOT;
  });

  it('pull responde 202 con la operación y sin esperar al git', async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-op-http-'));
    process.env.PROJECTS_ROOT = raiz;
    const repo = path.join(raiz, 'demo');
    fs.mkdirSync(repo);

    const vista: VistaOperacion = {
      operationId: 'a'.repeat(12),
      repository: repo,
      operationType: 'rebase',
      state: 'queued',
      progress: 0,
    };
    const casos = {
      programarPull: async () => vista,
      obtenerOperacion: (id: string) => (id === vista.operationId ? vista : undefined),
    };
    const controller = new GitController(casos as unknown as GitUseCases);
    const res = respuesta();

    await controller.pull(
      { body: { repoPath: repo, modo: 'rebase' } } as Request,
      res as unknown as Response
    );

    expect(res.codigo).toBe(202);
    expect(res.cuerpo).toMatchObject({
      exito: true,
      mensaje: 'Pull (rebase) en curso',
      datos: { operacion: vista },
    });
    expect(JSON.stringify(res.cuerpo)).not.toContain('metadata');
  });

  it('GET /operaciones/:id devuelve la vista o 404 y rechaza un id que no es hex', () => {
    const vista: VistaOperacion = {
      operationId: 'b'.repeat(12),
      repository: '/tmp/repo-b',
      operationType: 'fetch',
      state: 'running',
      progress: 10,
    };
    const casos = {
      obtenerOperacion: (id: string) => (id === vista.operationId ? vista : undefined),
    };
    const controller = new GitController(casos as unknown as GitUseCases);

    const malo = respuesta();
    controller.obtenerOperacion({ params: { id: '../otro-repo' } } as unknown as Request, malo as unknown as Response);
    expect(malo.codigo).toBe(400);

    const ausente = respuesta();
    controller.obtenerOperacion(
      { params: { id: 'c'.repeat(12) } } as unknown as Request,
      ausente as unknown as Response
    );
    expect(ausente.codigo).toBe(404);

    const ok = respuesta();
    controller.obtenerOperacion(
      { params: { id: vista.operationId } } as unknown as Request,
      ok as unknown as Response
    );
    expect(ok.codigo).toBe(200);
    expect(ok.cuerpo?.datos).toEqual(vista);
    expect(ok.cuerpo?.datos).not.toHaveProperty('metadata');
  });
});

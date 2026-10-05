import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { hubWebSocket } from '../../../infrastructure/ws/HubWebSocket.js';
import { GitController } from '../../../interfaces/http/controllers/GitController.js';
import { GitUseCases } from '../../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../../deshacer/JournalOperaciones.js';
import { OperationManager } from '../OperationManager.js';
import { RepositoryOperationLock } from '../RepositoryOperationLock.js';
import { RegistroOperaciones } from '../RegistroOperaciones.js';

class AdaptadorFetchControlado extends SimpleGitAdapter {
  termino = false;

  constructor(
    private readonly esperaMs: number,
    private readonly errorTrasEspera?: Error
  ) {
    super(new InMemoryCommandLogAdapter());
  }

  override async getRemotes() {
    return [
      {
        name: 'origin',
        fetchUrl: 'https://github.com/abyssan/inexistente.git',
        pushUrl: 'https://github.com/abyssan/inexistente.git',
      },
    ];
  }

  override async fetchAll(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, this.esperaMs));
    this.termino = true;
    if (this.errorTrasEspera) throw this.errorTrasEspera;
  }
}

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

async function crearRepo(raiz: string, nombre: string) {
  const repo = path.join(raiz, nombre);
  fs.mkdirSync(repo, { recursive: true });
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@abyssan.dev');
  await git.addConfig('user.name', 'Test Abyssan');
  fs.writeFileSync(path.join(repo, 'archivo.txt'), 'base\n');
  await git.add('.');
  await git.commit('inicial');
  const ramaBase = (await git.status()).current!;
  return { repo, git, ramaBase };
}

describe('C2 — ciclo de operación (async, restart, WS, journal)', { timeout: 25_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz = '';
  let dirJournal = '';

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-c2-'));
    dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-c2-j-'));
    process.env.PROJECTS_ROOT = raiz;
  });

  afterEach(() => {
    if (raizOriginal !== undefined) process.env.PROJECTS_ROOT = raizOriginal;
    else delete process.env.PROJECTS_ROOT;
    try {
      if (raiz) fs.rmSync(raiz, { recursive: true, force: true });
    } catch {
      // Windows puede retener el lock de git
    }
    try {
      if (dirJournal) fs.rmSync(dirJournal, { recursive: true, force: true });
    } catch {
      // journal en uso
    }
  });

  it('HTTP 202 de fetch vuelve antes de que git termine; un fallo posterior queda en failed', async () => {
    const { repo } = await crearRepo(raiz, 'async-202');
    const adaptador = new AdaptadorFetchControlado(80, new Error('fetch remoto caído'));
    const lock = new RepositoryOperationLock();
    const gestor = new OperationManager(lock, new RegistroOperaciones());
    const casos = new GitUseCases(
      adaptador,
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal),
      gestor
    );
    const controller = new GitController(casos);
    const res = respuesta();

    await controller.fetch({ body: { repoPath: repo } } as Request, res as unknown as Response);

    expect(res.codigo).toBe(202);
    expect(adaptador.termino).toBe(false);
    const operacion = (res.cuerpo?.datos as { operacion?: { operationId: string; state: string } })?.operacion;
    expect(operacion?.operationId).toMatch(/^[a-f0-9]{12}$/);
    expect(operacion?.state === 'queued' || operacion?.state === 'running').toBe(true);

    const final = await gestor.esperar(operacion!.operationId);
    expect(adaptador.termino).toBe(true);
    expect(final?.state).toBe('failed');
    expect(final?.error).toMatch(/caído/);
    expect(lock.hayTrabajo(repo)).toBe(false);
    expect(casos.listarJournal(repo)).toEqual([]);
  });

  it('un rechazo inmediato (file://) no abre 202 ni crea operación', async () => {
    const { repo, git } = await crearRepo(raiz, 'fail-inmediato');
    await git.addRemote('escape', 'file:///tmp/no-existe');
    const lock = new RepositoryOperationLock();
    const gestor = new OperationManager(lock, new RegistroOperaciones());
    const casos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal),
      gestor
    );
    const controller = new GitController(casos);
    const res = respuesta();

    await controller.fetch({ body: { repoPath: repo } } as Request, res as unknown as Response);

    expect(res.codigo).not.toBe(202);
    expect(res.cuerpo?.exito).toBe(false);
    expect(gestor.listar()).toEqual([]);
    expect(lock.hayTrabajo(repo)).toBe(false);
  });

  it('GET /operaciones y GET /operaciones/:id no comparten contrato; cancelled se espeja como fallo', async () => {
    const registro = new RegistroOperaciones();
    const gestor = new OperationManager(new RepositoryOperationLock(), registro);
    const casos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal),
      gestor
    );
    const repo = path.join(raiz, 'contratos');
    fs.mkdirSync(repo);

    const primera = gestor.iniciar({
      repository: repo,
      type: 'merge',
      trabajo: async () => {
        await new Promise((resolver) => setTimeout(resolver, 50));
      },
    });
    await expect.poll(() => gestor.obtener(primera.operationId)?.state).toBe('running');
    const segunda = gestor.iniciar({
      repository: repo,
      type: 'pull',
      trabajo: async () => undefined,
    });
    expect(gestor.cancelar(segunda.operationId)).toBe(true);
    await gestor.esperar(primera.operationId);
    await gestor.esperar(segunda.operationId);

    const lista = casos.listarOperaciones();
    const porId = casos.obtenerOperacion(segunda.operationId);
    const legado = registro.listar().find((op) => op.id === segunda.operationId);

    expect(lista).toEqual([]);
    expect(porId).toMatchObject({ operationId: segunda.operationId, state: 'cancelled' });
    expect(legado).toMatchObject({ id: segunda.operationId, estado: 'fallo' });
  });

  it('el mismo ciclo emite operation.* y OPERACION_PROGRESO', async () => {
    const eventosManager: string[] = [];
    const registro = new RegistroOperaciones();
    const gestor = new OperationManager(new RepositoryOperationLock(), registro, (repo, mensaje) => {
      eventosManager.push(String(mensaje.type));
      hubWebSocket.emitirARepo(repo, mensaje);
    });
    const socket = {
      readyState: 1,
      enviados: [] as string[],
      send(cuerpo: string) {
        this.enviados.push(cuerpo);
      },
      on() {
        return this;
      },
    };
    hubWebSocket.registrar(socket as unknown as WebSocket);
    hubWebSocket.asociarRepo(socket as unknown as WebSocket, '/tmp/doble-evento');
    try {
      const op = gestor.iniciar({
        repository: '/tmp/doble-evento',
        type: 'fetch',
        trabajo: async (onProgreso) => {
          onProgreso({ etapa: 'Receiving objects', porcentaje: 40 });
        },
      });
      await gestor.esperar(op.operationId);
      const tiposHub = socket.enviados.map((raw) => (JSON.parse(raw) as { type: string }).type);
      expect(eventosManager).toEqual(['operation.started', 'operation.progress', 'operation.completed']);
      expect(tiposHub.filter((tipo) => tipo === 'OPERACION_PROGRESO').length).toBeGreaterThanOrEqual(2);
      expect(tiposHub).toContain('operation.completed');
    } finally {
      hubWebSocket.desregistrar(socket as unknown as WebSocket);
    }
  });

  it('tras un reinicio simulado el manager queda vacío y el journal persiste; no hay recovery de operación', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'restart');
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'extra.ts'), 'export const n = 1;\n');
    await git.add('.');
    await git.commit('extra');
    await git.checkout(ramaBase);

    const lockVivo = new RepositoryOperationLock();
    const gestorVivo = new OperationManager(lockVivo, new RegistroOperaciones());
    const journalVivo = new JournalOperaciones(dirJournal);
    const casosVivos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      journalVivo,
      gestorVivo
    );
    const operacion = await casosVivos.merge(repo, 'feature');
    expect(operacion.state).toBe('completed');
    expect(gestorVivo.listar()).toHaveLength(1);

    const gestorTrasReinicio = new OperationManager(new RepositoryOperationLock(), new RegistroOperaciones());
    const journalTrasReinicio = new JournalOperaciones(dirJournal);
    const casosTrasReinicio = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      journalTrasReinicio,
      gestorTrasReinicio
    );

    expect(gestorTrasReinicio.listar()).toEqual([]);
    expect(casosTrasReinicio.obtenerOperacion(operacion.operationId)).toBeUndefined();
    const journal = casosTrasReinicio.listarJournal(repo);
    expect(journal).toHaveLength(1);
    expect(journal[0].id).not.toBe(operacion.operationId);
    expect(journal[0].tipo).toBe('merge');
    expect(fs.existsSync(path.join(repo, 'extra.ts'))).toBe(true);
  });

  it('un merge fallido deja Git a medias, operación failed y journal sin esa ejecución', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'merge-fallido');
    await git.checkoutLocalBranch('otra');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'otra\n');
    await git.add('.');
    await git.commit('otra');
    await git.checkout(ramaBase);
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'main\n');
    await git.add('.');
    await git.commit('main');

    const lock = new RepositoryOperationLock();
    const gestor = new OperationManager(lock, new RegistroOperaciones());
    const casos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal),
      gestor
    );

    await expect(casos.merge(repo, 'otra')).rejects.toThrow();
    const fallida = gestor.listar().find((op) => op.repository === repo);
    expect(fallida?.state).toBe('failed');
    expect(lock.hayTrabajo(repo)).toBe(false);
    expect(casos.listarJournal(repo)).toEqual([]);
    const status = await casos.getRepositoryStatus(repo);
    expect(status.isMerging).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket, type WebSocketServer } from 'ws';
import { adjuntarWebSocket } from '../adjuntarWebSocket.js';
import { HubWebSocket } from '../HubWebSocket.js';
import { ChokidarWatcherAdapter } from '../../watcher/ChokidarWatcherAdapter.js';
import { validarRutaRepositorio } from '../../seguridad/validarRutaRepositorio.js';
import { OperationManager } from '../../../application/operaciones/OperationManager.js';
import { RepositoryOperationLock } from '../../../application/operaciones/RepositoryOperationLock.js';
import { RegistroOperaciones } from '../../../application/operaciones/RegistroOperaciones.js';

function esperarApertura(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function esperarCierre(ws: WebSocket): Promise<{ codigo: number }> {
  return new Promise((resolve) => {
    ws.once('close', (codigo) => resolve({ codigo }));
  });
}

function eventosDe(ws: WebSocket): Record<string, unknown>[] {
  const mensajes: Record<string, unknown>[] = [];
  ws.on('message', (raw) => {
    const data = JSON.parse(raw.toString()) as Record<string, unknown>;
    if (typeof data.type === 'string' && data.type.startsWith('operation.')) {
      mensajes.push(data);
    }
  });
  return mensajes;
}

describe('eventos de operación por WebSocket', () => {
  const bindOriginal = process.env.BIND_HOST;
  const tokenOriginal = process.env.ABYSSAN_API_TOKEN;
  const raizOriginal = process.env.PROJECTS_ROOT;

  let server: http.Server;
  let wss: WebSocketServer;
  let hub: HubWebSocket;
  let watcher: ChokidarWatcherAdapter;
  let puerto: number;
  let raiz: string;
  let gestor: OperationManager;
  const clientes: WebSocket[] = [];

  async function conectar(query = ''): Promise<WebSocket> {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}/${query}`);
    ws.on('error', () => undefined);
    clientes.push(ws);
    await esperarApertura(ws);
    return ws;
  }

  async function vigilar(ws: WebSocket, repo: string, oyentes = 1): Promise<string> {
    const ruta = validarRutaRepositorio(repo);
    ws.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(oyentes);
    return ruta;
  }

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-op-ws-'));
    process.env.PROJECTS_ROOT = raiz;
    delete process.env.BIND_HOST;
    delete process.env.ABYSSAN_API_TOKEN;

    hub = new HubWebSocket();
    watcher = new ChokidarWatcherAdapter();
    gestor = new OperationManager(new RepositoryOperationLock(), new RegistroOperaciones(), (repo, mensaje) => {
      hub.emitirARepo(repo, mensaje);
    });
    server = http.createServer();
    wss = adjuntarWebSocket(server, { hub, watcher, timeoutAuthMs: 250 });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('No se obtuvo puerto WS de prueba');
    puerto = addr.port;
  });

  afterEach(async () => {
    for (const ws of clientes) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    }
    clientes.length = 0;
    await watcher.closeAll();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    fs.rmSync(raiz, { recursive: true, force: true });
    if (bindOriginal !== undefined) process.env.BIND_HOST = bindOriginal;
    else delete process.env.BIND_HOST;
    if (tokenOriginal !== undefined) process.env.ABYSSAN_API_TOKEN = tokenOriginal;
    else delete process.env.ABYSSAN_API_TOKEN;
    if (raizOriginal !== undefined) process.env.PROJECTS_ROOT = raizOriginal;
    else delete process.env.PROJECTS_ROOT;
  });

  it('en loopback una sesión vigilando el repo recibe started, progress y completed', async () => {
    const uno = path.join(raiz, 'uno');
    const dos = path.join(raiz, 'dos');
    fs.mkdirSync(uno);
    fs.mkdirSync(dos);

    const a = await conectar();
    const b = await conectar();
    const suelto = await conectar();
    const deA = eventosDe(a);
    const deB = eventosDe(b);
    const deSuelto = eventosDe(suelto);
    const rutaUno = await vigilar(a, uno);
    await vigilar(b, dos);

    const op = gestor.iniciar({
      repository: rutaUno,
      type: 'fetch',
      trabajo: async (onProgreso) => {
        onProgreso({ etapa: 'Receiving objects', porcentaje: 55 });
      },
    });
    await gestor.esperar(op.operationId);

    await expect.poll(() => deA.map((e) => e.type)).toEqual([
      'operation.started',
      'operation.progress',
      'operation.completed',
    ]);
    expect(deA[2]).toMatchObject({
      operationId: op.operationId,
      repository: rutaUno,
      operationType: 'fetch',
      state: 'completed',
    });
    expect(deB).toEqual([]);
    expect(deSuelto).toEqual([]);
    expect(JSON.stringify(deA)).not.toContain('Receiving objects');
  });

  it('un fallo se publica solo al repo de la operación', async () => {
    const uno = path.join(raiz, 'fallo');
    fs.mkdirSync(uno);
    const a = await conectar();
    const deA = eventosDe(a);
    const ruta = await vigilar(a, uno);

    const op = gestor.iniciar({
      repository: ruta,
      type: 'push',
      trabajo: async () => {
        throw new Error('fatal: https://user:ghp_secreto@github.com/acme/r.git');
      },
    });
    await gestor.esperar(op.operationId);

    await expect.poll(() => deA.some((e) => e.type === 'operation.failed')).toBe(true);
    const fallo = deA.find((e) => e.type === 'operation.failed');
    expect(fallo).toMatchObject({
      operationId: op.operationId,
      repository: ruta,
      operationType: 'push',
      state: 'failed',
    });
    expect(JSON.stringify(fallo)).not.toContain('ghp_secreto');
  });

  it('en LAN el token de la query no autentica y no recibe eventos', async () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    const repo = path.join(raiz, 'lan');
    fs.mkdirSync(repo);
    const ruta = validarRutaRepositorio(repo);

    const anonimo = await conectar('?token=secreto-lan');
    const deAnonimo = eventosDe(anonimo);
    expect(hub.cantidadClientes()).toBe(0);
    anonimo.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    expect((await esperarCierre(anonimo)).codigo).toBe(4401);

    gestor.iniciar({
      repository: ruta,
      type: 'fetch',
      trabajo: async () => undefined,
    });
    await new Promise((r) => setTimeout(r, 40));
    expect(deAnonimo).toEqual([]);
  });

  it('en LAN una sesión autenticada recibe el evento y la otra repo no', async () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    const uno = path.join(raiz, 'auth-uno');
    const dos = path.join(raiz, 'auth-dos');
    fs.mkdirSync(uno);
    fs.mkdirSync(dos);

    const a = await conectar();
    const b = await conectar();
    const authA = new Promise<Record<string, unknown>>((resolve) => {
      a.once('message', (raw) => resolve(JSON.parse(raw.toString()) as Record<string, unknown>));
    });
    const authB = new Promise<void>((resolve) => {
      b.once('message', () => resolve());
    });
    a.send(JSON.stringify({ type: 'AUTH', token: 'secreto-lan' }));
    b.send(JSON.stringify({ type: 'AUTH', token: 'secreto-lan' }));
    expect(await authA).toEqual({ type: 'AUTH_OK' });
    await authB;

    const deA = eventosDe(a);
    const deB = eventosDe(b);
    const rutaUno = await vigilar(a, uno);
    await vigilar(b, dos);

    const op = gestor.iniciar({
      repository: rutaUno,
      type: 'clone',
      trabajo: async () => undefined,
    });
    await gestor.esperar(op.operationId);
    await expect.poll(() => deA.some((e) => e.type === 'operation.completed')).toBe(true);
    expect(deB.filter((e) => e.type === 'operation.completed')).toEqual([]);
  });

  it('un cliente que se desconecta deja de recibir eventos de su repo', async () => {
    const uno = path.join(raiz, 'corta');
    fs.mkdirSync(uno);
    const a = await conectar();
    const c = await conectar();
    const deA = eventosDe(a);
    const deC = eventosDe(c);
    const ruta = await vigilar(a, uno, 1);
    await vigilar(c, uno, 2);
    expect(hub.cantidadClientes()).toBe(2);

    const cierre = esperarCierre(c);
    c.close();
    await cierre;
    await expect.poll(() => hub.cantidadClientes()).toBe(1);

    const op = gestor.iniciar({
      repository: ruta,
      type: 'fetch',
      trabajo: async () => undefined,
    });
    await gestor.esperar(op.operationId);
    await expect.poll(() => deA.some((e) => e.type === 'operation.completed')).toBe(true);
    expect(deC).toEqual([]);
  });
});

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

function esperarApertura(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function esperarCierre(ws: WebSocket): Promise<{ codigo: number; razon: string }> {
  return new Promise((resolve) => {
    ws.once('close', (codigo, razon) => {
      resolve({ codigo, razon: razon.toString() });
    });
  });
}

function esperarJson(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => {
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>);
    });
  });
}

describe('adjuntarWebSocket', () => {
  const bindOriginal = process.env.BIND_HOST;
  const tokenOriginal = process.env.ABYSSAN_API_TOKEN;
  const raizOriginal = process.env.PROJECTS_ROOT;

  let server: http.Server;
  let wss: WebSocketServer;
  let hub: HubWebSocket;
  let watcher: ChokidarWatcherAdapter;
  let puerto: number;
  let raiz: string;
  const clientes: WebSocket[] = [];

  async function conectar(query = '', headers?: Record<string, string>): Promise<WebSocket> {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}/${query}`, { headers });
    ws.on('error', () => undefined);
    clientes.push(ws);
    await esperarApertura(ws);
    return ws;
  }

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-ws-'));
    process.env.PROJECTS_ROOT = raiz;
    delete process.env.BIND_HOST;
    delete process.env.ABYSSAN_API_TOKEN;

    hub = new HubWebSocket();
    watcher = new ChokidarWatcherAdapter();
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
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
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

  it('en loopback ignora ?token= y acepta WATCH_REPO sin AUTH', async () => {
    const repo = path.join(raiz, 'demo');
    fs.mkdirSync(repo, { recursive: true });
    const ruta = validarRutaRepositorio(repo);

    const ws = await conectar('?token=no-cuenta');
    ws.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(1);
  });

  it('en LAN el token de query no autentica; WATCH_REPO cierra 4401', async () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';

    const ws = new WebSocket(`ws://127.0.0.1:${puerto}/?token=secreto-lan`);
    ws.on('error', () => undefined);
    clientes.push(ws);
    await esperarApertura(ws);
    const cierre = esperarCierre(ws);
    ws.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: path.join(raiz, 'demo') }));
    const resultado = await cierre;
    expect(resultado.codigo).toBe(4401);
  });

  it('en LAN AUTH válido responde AUTH_OK y permite vigilar', async () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    const repo = path.join(raiz, 'lan');
    fs.mkdirSync(repo, { recursive: true });
    const ruta = validarRutaRepositorio(repo);

    const ws = await conectar();
    const authOk = esperarJson(ws);
    ws.send(JSON.stringify({ type: 'AUTH', token: 'secreto-lan' }));
    expect(await authOk).toEqual({ type: 'AUTH_OK' });
    ws.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(1);
  });

  it('en LAN cierra 4401 si no llega AUTH a tiempo', async () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    const ws = await conectar();
    const cierre = await esperarCierre(ws);
    expect(cierre.codigo).toBe(4401);
  });

  it('segundo cliente del mismo repo comparte watcher; al cerrar el último se limpia', async () => {
    const repo = path.join(raiz, 'compartido');
    fs.mkdirSync(repo, { recursive: true });
    const ruta = validarRutaRepositorio(repo);

    const a = await conectar();
    const b = await conectar();
    a.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    b.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: repo }));
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(2);
    expect(watcher.cantidadWatchers()).toBe(1);

    a.close();
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(1);
    expect(watcher.cantidadWatchers()).toBe(1);

    b.close();
    await expect.poll(() => watcher.cantidadOyentes(ruta)).toBe(0);
    await expect.poll(() => watcher.cantidadWatchers()).toBe(0);
  });

  it('OPERACION_PROGRESO solo llega a clientes del mismo repo', async () => {
    const uno = path.join(raiz, 'uno');
    const dos = path.join(raiz, 'dos');
    fs.mkdirSync(uno, { recursive: true });
    fs.mkdirSync(dos, { recursive: true });
    const rutaUno = validarRutaRepositorio(uno);
    const rutaDos = validarRutaRepositorio(dos);

    const a = await conectar();
    const b = await conectar();
    a.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: uno }));
    b.send(JSON.stringify({ type: 'WATCH_REPO', repoPath: dos }));
    await expect.poll(() => watcher.cantidadOyentes(rutaUno)).toBe(1);
    await expect.poll(() => watcher.cantidadOyentes(rutaDos)).toBe(1);

    const progreso = esperarJson(a);
    let filtrado = false;
    b.once('message', () => {
      filtrado = true;
    });
    hub.emitirARepo(rutaUno, { type: 'OPERACION_PROGRESO', datos: { id: 'op-ws' } });
    expect(await progreso).toMatchObject({ type: 'OPERACION_PROGRESO', datos: { id: 'op-ws' } });
    await new Promise((r) => setTimeout(r, 40));
    expect(filtrado).toBe(false);
  });

  it('Origin no permitido cierra 4403', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}`, {
      headers: { Origin: 'https://evil.example' },
    });
    ws.on('error', () => undefined);
    clientes.push(ws);
    const cierre = await esperarCierre(ws);
    expect(cierre.codigo).toBe(4403);
  });
});

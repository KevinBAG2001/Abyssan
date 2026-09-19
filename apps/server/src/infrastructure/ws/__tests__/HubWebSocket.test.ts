import { describe, it, expect } from 'vitest';
import type { WebSocket } from 'ws';
import { HubWebSocket } from '../HubWebSocket.js';

type SocketPrueba = {
  readyState: number;
  enviados: string[];
  send: (cuerpo: string) => void;
  on: (evento: string, fn: () => void) => void;
  emitirClose: () => void;
};

function crearSocket(): SocketPrueba {
  let alCerrar: (() => void) | undefined;
  return {
    readyState: 1,
    enviados: [],
    send(cuerpo) {
      this.enviados.push(cuerpo);
    },
    on(evento, fn) {
      if (evento === 'close') alCerrar = fn;
    },
    emitirClose() {
      alCerrar?.();
    },
  };
}

describe('HubWebSocket', () => {
  it('emitirARepo solo llega a clientes que vigilan ese repo', () => {
    const hub = new HubWebSocket();
    const a = crearSocket();
    const b = crearSocket();
    hub.registrar(a as unknown as WebSocket);
    hub.registrar(b as unknown as WebSocket);
    hub.asociarRepo(a as unknown as WebSocket, 'C:/repos/Uno');
    hub.asociarRepo(b as unknown as WebSocket, 'C:/repos/Dos');

    hub.emitirARepo('C:/repos/uno/', { type: 'OPERACION_PROGRESO', datos: { id: 'op-1' } });

    expect(a.enviados).toHaveLength(1);
    expect(JSON.parse(a.enviados[0])).toMatchObject({ type: 'OPERACION_PROGRESO', datos: { id: 'op-1' } });
    expect(b.enviados).toHaveLength(0);
  });

  it('no reenvía a un socket ya cerrado', () => {
    const hub = new HubWebSocket();
    const a = crearSocket();
    hub.registrar(a as unknown as WebSocket);
    hub.asociarRepo(a as unknown as WebSocket, '/repos/uno');
    a.emitirClose();
    a.readyState = 3;

    hub.emitirARepo('/repos/uno', { type: 'OPERACION_PROGRESO' });
    expect(a.enviados).toHaveLength(0);
  });

  it('desasociarRepo deja de recibir eventos de ese repo', () => {
    const hub = new HubWebSocket();
    const a = crearSocket();
    hub.registrar(a as unknown as WebSocket);
    hub.asociarRepo(a as unknown as WebSocket, '/repos/uno');
    hub.desasociarRepo(a as unknown as WebSocket);
    hub.emitirARepo('/repos/uno', { type: 'OPERACION_PROGRESO' });
    expect(a.enviados).toHaveLength(0);
  });

  it('registrar es idempotente y no duplica el handler de close', () => {
    const hub = new HubWebSocket();
    const a = crearSocket();
    hub.registrar(a as unknown as WebSocket);
    hub.registrar(a as unknown as WebSocket);
    hub.asociarRepo(a as unknown as WebSocket, '/repos/uno');
    a.emitirClose();
    hub.emitirARepo('/repos/uno', { type: 'OPERACION_PROGRESO' });
    expect(a.enviados).toHaveLength(0);
  });
});

import type { WebSocket } from 'ws';

/**
 * Difusión de eventos WS (progreso de operaciones). No envía contenido de archivos.
 */
export class HubWebSocket {
  private clientes = new Set<WebSocket>();

  registrar(ws: WebSocket): void {
    this.clientes.add(ws);
    ws.on('close', () => this.clientes.delete(ws));
  }

  emitir(mensaje: Record<string, unknown>): void {
    const cuerpo = JSON.stringify(mensaje);
    for (const ws of this.clientes) {
      if (ws.readyState === 1) {
        ws.send(cuerpo);
      }
    }
  }
}

export const hubWebSocket = new HubWebSocket();

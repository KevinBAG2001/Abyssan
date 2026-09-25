import type { WebSocket } from 'ws';

function claveRepo(repo: string): string {
  return repo.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

/**
 * Difusión de eventos WS. No envía contenido de archivos.
 * Los eventos de un repositorio van por `emitirARepo`.
 * `emitirGlobal` es la excepción: llega a toda sesión autenticada.
 */
export class HubWebSocket {
  private clientes = new Map<WebSocket, { repo?: string }>();

  registrar(ws: WebSocket): void {
    if (this.clientes.has(ws)) return;
    this.clientes.set(ws, {});
    ws.on('close', () => this.desregistrar(ws));
  }

  desregistrar(ws: WebSocket): void {
    this.clientes.delete(ws);
  }

  cantidadClientes(): number {
    return this.clientes.size;
  }

  asociarRepo(ws: WebSocket, repo: string): void {
    const sesion = this.clientes.get(ws);
    if (sesion) sesion.repo = repo;
  }

  desasociarRepo(ws: WebSocket): void {
    const sesion = this.clientes.get(ws);
    if (sesion) sesion.repo = undefined;
  }

  /**
   * Broadcast a toda sesión abierta, vigile o no un repositorio.
   * Exige un motivo para que el alcance global sea deliberado.
   */
  emitirGlobal(mensaje: Record<string, unknown>, motivo: string): void {
    if (!motivo.trim()) {
      throw new Error('Un broadcast global exige un motivo explícito');
    }
    const cuerpo = JSON.stringify(mensaje);
    for (const [ws] of this.clientes) {
      if (ws.readyState === 1) {
        ws.send(cuerpo);
      }
    }
  }

  emitirARepo(repo: string, mensaje: Record<string, unknown>): void {
    const clave = claveRepo(repo);
    const cuerpo = JSON.stringify(mensaje);
    for (const [ws, sesion] of this.clientes) {
      if (ws.readyState !== 1 || !sesion.repo) continue;
      if (claveRepo(sesion.repo) === clave) {
        ws.send(cuerpo);
      }
    }
  }
}

export const hubWebSocket = new HubWebSocket();

import { obtenerIdSesionCliente } from '../infrastructure/config/entornoCliente';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

type RepoChangeCallback = (data: { repoPath: string; eventType: string; filePath: string }) => void;
type OperacionCallback = (data: unknown) => void;

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<RepoChangeCallback> = new Set();
  private listenersOperacion: Set<OperacionCallback> = new Set();
  private currentRepoPath: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(WS_BASE);

      this.socket.onopen = () => {
        const idSesion = obtenerIdSesionCliente();
        if (idSesion) {
          this.socket?.send(JSON.stringify({ type: 'AUTH', token: idSesion }));
        }
        if (this.currentRepoPath) {
          this.watchRepo(this.currentRepoPath);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'REPO_CHANGED') {
            this.listeners.forEach((callback) => callback(data));
          }
          if (data.type === 'OPERACION_PROGRESO') {
            this.listenersOperacion.forEach((callback) => callback(data.datos));
          }
        } catch (e) {
          console.error('[Abyssan] Error parseando mensaje WS:', e);
        }
      };

      this.socket.onclose = () => {
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  watchRepo(repoPath: string) {
    this.currentRepoPath = repoPath;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'WATCH_REPO', repoPath }));
    }
  }

  unwatchRepo() {
    this.currentRepoPath = null;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'UNWATCH' }));
    }
  }

  onRepoChange(callback: RepoChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  onOperacion(callback: OperacionCallback): () => void {
    this.listenersOperacion.add(callback);
    return () => {
      this.listenersOperacion.delete(callback);
    };
  }
}

export const wsClient = new WebSocketClient();

import type http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { validarRutaRepositorio } from '../seguridad/validarRutaRepositorio.js';
import { tokenEsValido, tokenLanEsObligatorio } from '../seguridad/tokenInstancia.js';
import { extraerOrigin, origenDePeticionPermitido } from '../seguridad/origenesPermitidos.js';
import { watcherAdapter, type ChangeCallback, ChokidarWatcherAdapter } from '../watcher/ChokidarWatcherAdapter.js';
import { hubWebSocket, HubWebSocket } from './HubWebSocket.js';
import { MaquinaSesionWs } from './MaquinaSesionWs.js';

const TIMEOUT_AUTH_MS = 5_000;

export type DependenciasWs = {
  watcher?: ChokidarWatcherAdapter;
  hub?: HubWebSocket;
  timeoutAuthMs?: number;
};

export function adjuntarWebSocket(server: http.Server, deps: DependenciasWs = {}): WebSocketServer {
  const watcher = deps.watcher ?? watcherAdapter;
  const hub = deps.hub ?? hubWebSocket;
  const timeoutAuthMs = deps.timeoutAuthMs ?? TIMEOUT_AUTH_MS;
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req) => {
    if (!origenDePeticionPermitido(extraerOrigin(req.headers.origin))) {
      ws.close(4403, 'Origen no permitido');
      return;
    }

    const sesion = new MaquinaSesionWs(tokenLanEsObligatorio());
    let repoVigilado: string | undefined;
    let timeoutAuth: NodeJS.Timeout | undefined;

    const alCambio: ChangeCallback = (repoPath, eventType, filePath) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'REPO_CHANGED',
            repoPath,
            eventType,
            filePath,
            timestamp: new Date().toISOString(),
          })
        );
      }
    };

    if (sesion.autenticado) {
      hub.registrar(ws);
    } else {
      timeoutAuth = setTimeout(() => {
        if (!sesion.autenticado && ws.readyState === WebSocket.OPEN) {
          ws.close(4401, 'Token de instancia requerido');
        }
      }, timeoutAuthMs);
    }

    ws.on('message', (message: WebSocket.RawData) => {
      try {
        const data = JSON.parse(message.toString()) as unknown;
        const accion = sesion.procesar(data, tokenEsValido);

        if (accion.tipo === 'cerrar') {
          ws.close(accion.codigo, accion.razon);
          return;
        }
        if (accion.tipo === 'auth_ok') {
          if (timeoutAuth) {
            clearTimeout(timeoutAuth);
            timeoutAuth = undefined;
          }
          hub.registrar(ws);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'AUTH_OK' }));
          }
          return;
        }
        if (accion.tipo === 'error') {
          ws.send(JSON.stringify({ type: 'ERROR', message: accion.message }));
          return;
        }
        if (accion.tipo === 'vigilar') {
          let rutaValidada: string;
          try {
            rutaValidada = validarRutaRepositorio(accion.repoPath);
          } catch {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Ruta de repositorio no autorizada' }));
            return;
          }
          if (repoVigilado) {
            watcher.unwatchRepo(repoVigilado, alCambio);
          }
          repoVigilado = rutaValidada;
          hub.asociarRepo(ws, rutaValidada);
          watcher.watchRepo(rutaValidada, alCambio);
        }
      } catch (err) {
        console.error('[Abyssan] Error procesando mensaje WS:', err);
      }
    });

    ws.on('close', () => {
      if (timeoutAuth) clearTimeout(timeoutAuth);
      watcher.dejarDeEscuchar(alCambio);
    });
  });

  return wss;
}

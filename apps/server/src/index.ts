import { cargarEntorno } from './infrastructure/seguridad/cargarEntorno.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { gitRouter } from './interfaces/http/routes/GitRoutes.js';
import { authRouter } from './interfaces/http/routes/AuthForjasRoutes.js';
import { forjasRouter } from './interfaces/http/routes/ForjasRoutes.js';
import { authForjasController } from './interfaces/http/controllers/AuthForjasController.js';
import { watcherAdapter } from './infrastructure/watcher/ChokidarWatcherAdapter.js';
import { validarRutaRepositorio } from './infrastructure/seguridad/validarRutaRepositorio.js';
import {
  conexionWsAutorizada,
  obtenerBindHost,
  validarConfiguracionToken,
} from './infrastructure/seguridad/tokenInstancia.js';
import { middlewareTokenInstancia } from './interfaces/http/middlewareToken.js';
import { hubWebSocket } from './infrastructure/ws/HubWebSocket.js';
import { middlewareLimiteTasa } from './infrastructure/seguridad/limiteTasa.js';

cargarEntorno();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const BIND_HOST = obtenerBindHost();

validarConfiguracionToken();

if (!process.env.PROJECTS_ROOT?.trim()) {
  console.error('[Abyssan] PROJECTS_ROOT no está configurado. Copia .env.example a .env en la raíz del repo.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use('/api', middlewareLimiteTasa);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    producto: 'Abyssan',
    architecture: 'Domain-Driven Design (DDD)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/callback', (req, res) => authForjasController.callback(req, res));
app.use('/api', middlewareTokenInstancia);
app.use('/api/auth', authRouter);
app.use('/api/git', gitRouter);
app.use('/api/forjas', forjasRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  if (!conexionWsAutorizada(req)) {
    ws.close(4401, 'Token de instancia requerido');
    return;
  }

  hubWebSocket.registrar(ws);

  console.log('[Abyssan] Cliente WebSocket conectado');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'WATCH_REPO' && data.repoPath) {
        let rutaValidada: string;
        try {
          rutaValidada = validarRutaRepositorio(data.repoPath);
        } catch {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Ruta de repositorio no autorizada' }));
          return;
        }
        console.log(`[Abyssan] Monitoreando repositorio: ${rutaValidada}`);
        watcherAdapter.watchRepo(rutaValidada, (repoPath, eventType, filePath) => {
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
        });
      }
    } catch (err) {
      console.error('[Abyssan] Error procesando mensaje WS:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Abyssan] Cliente WebSocket desconectado');
  });
});

server.listen(PORT, BIND_HOST, () => {
  console.log(`[Abyssan] API en http://${BIND_HOST}:${PORT}`);
  console.log(`[Abyssan] WebSocket en ws://${BIND_HOST}:${PORT}`);
});

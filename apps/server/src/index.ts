// Austria: Servidor principal de WebKraken bajo arquitectura Domain-Driven Design (DDD)
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { gitRouter } from './interfaces/http/routes/GitRoutes.js';
import { watcherAdapter } from './infrastructure/watcher/ChokidarWatcherAdapter.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Montaje de rutas de la API de Git (Interfaces Layer)
app.use('/api/git', gitRouter);

// Endpoint de estado
app.get('/health', (req, res) => {
  res.json({ status: 'ok', architecture: 'Domain-Driven Design (DDD)', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

// Servidor WebSocket para streaming de eventos de dominio en tiempo real
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebKraken] Cliente WebSocket conectado');

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'WATCH_REPO' && data.repoPath) {
        try {
          const { validarRutaRepositorio } = await import('./infrastructure/seguridad/validarRutaRepositorio.js');
          validarRutaRepositorio(data.repoPath);
        } catch {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Ruta de repositorio no autorizada' }));
          return;
        }
        console.log(`[WebKraken] Monitoreando repositorio: ${data.repoPath}`);
        watcherAdapter.watchRepo(data.repoPath, (repoPath, eventType, filePath) => {
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
      console.error('[WebKraken] Error procesando mensaje WS:', err);
    }
  });

  ws.on('close', () => {
    console.log('[WebKraken] Cliente WebSocket desconectado');
  });
});

server.listen(PORT, () => {
  console.log(`[WebKraken] Server DDD ejecutandose en http://localhost:${PORT}`);
  console.log(`[WebKraken] WebSocket Server activo en ws://localhost:${PORT}`);
});

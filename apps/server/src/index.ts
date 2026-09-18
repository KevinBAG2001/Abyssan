import { cargarEntorno } from './infrastructure/seguridad/cargarEntorno.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { gitRouter } from './interfaces/http/routes/GitRoutes.js';
import { authRouter } from './interfaces/http/routes/AuthForjasRoutes.js';
import { forjasRouter } from './interfaces/http/routes/ForjasRoutes.js';
import { sesionRouter } from './interfaces/http/routes/SesionRoutes.js';
import { authForjasController } from './interfaces/http/controllers/AuthForjasController.js';
import { adjuntarWebSocket } from './infrastructure/ws/adjuntarWebSocket.js';
import { middlewareTokenInstancia } from './interfaces/http/middlewareToken.js';
import { middlewareOrigenMutacion } from './interfaces/http/middlewareOrigen.js';
import { obtenerBindHost, validarConfiguracionToken } from './infrastructure/seguridad/tokenInstancia.js';
import { middlewareLimiteTasa } from './infrastructure/seguridad/limiteTasa.js';
import {
  listarOrigenesPermitidos,
  origenDePeticionPermitido,
} from './infrastructure/seguridad/origenesPermitidos.js';
import { aplicarIdentidadGitHost } from './infrastructure/git/aplicarIdentidadGitHost.js';

cargarEntorno();
if (!process.env.GIT_TERMINAL_PROMPT) {
  process.env.GIT_TERMINAL_PROMPT = '0';
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const BIND_HOST = obtenerBindHost();

validarConfiguracionToken();

if (!process.env.PROJECTS_ROOT?.trim()) {
  console.error('[Abyssan] PROJECTS_ROOT no está configurado. Copia .env.example a .env en la raíz del repo.');
  process.exit(1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (origenDePeticionPermitido(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/api', middlewareLimiteTasa);
app.use('/api', middlewareOrigenMutacion);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    producto: 'Abyssan',
    architecture: 'Domain-Driven Design (DDD)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/callback', (req, res) => authForjasController.callback(req, res));
app.use('/api', sesionRouter);
app.use('/api', middlewareTokenInstancia);
app.use('/api/auth', authRouter);
app.use('/api/git', gitRouter);
app.use('/api/forjas', forjasRouter);

const server = http.createServer(app);
adjuntarWebSocket(server);

async function arrancar(): Promise<void> {
  try {
    const aplicada = await aplicarIdentidadGitHost();
    if (aplicada) {
      console.log('[Abyssan] Identidad git del host aplicada (solo user.name / user.email).');
    }
  } catch (err: unknown) {
    const detalle = err instanceof Error ? err.message : String(err);
    console.error('[Abyssan] No se pudo aplicar la identidad git del host:', detalle);
  }

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[Abyssan] Puerto ${PORT} ocupado en ${BIND_HOST}. ` +
          'Docker (abyssan-server) y `pnpm dev` / `pnpm dev:server` no pueden escuchar a la vez. ' +
          'Deja solo uno: `docker compose stop server` o no lances el API nativo.'
      );
      process.exit(1);
    }
    console.error('[Abyssan] Error del servidor HTTP:', err.message);
    process.exit(1);
  });

  server.listen(PORT, BIND_HOST, () => {
    console.log(`[Abyssan] API en http://${BIND_HOST}:${PORT}`);
    console.log(`[Abyssan] WebSocket en ws://${BIND_HOST}:${PORT}`);
    console.log(`[Abyssan] CORS: ${listarOrigenesPermitidos().join(', ')}`);
  });
}

void arrancar();

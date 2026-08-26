import { Router } from 'express';
import { CasosUsoForja } from '../../../application/forjas/CasosUsoForja.js';
import { ForjasController } from '../controllers/ForjasController.js';
import { gitRepository } from './GitRoutes.js';

const casos = new CasosUsoForja(gitRepository);
const controller = new ForjasController(casos);

export const forjasRouter = Router();

forjasRouter.get('/solicitudes', (req, res) => controller.listar(req, res));
forjasRouter.get('/solicitudes/:numero/diff', (req, res) => controller.diff(req, res));
forjasRouter.post('/solicitudes/:numero/checkout', (req, res) => controller.checkout(req, res));
forjasRouter.post('/solicitudes', (req, res) => controller.crear(req, res));

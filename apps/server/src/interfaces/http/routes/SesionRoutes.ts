import { Router } from 'express';
import { sesionController } from '../controllers/SesionController.js';

export const sesionRouter = Router();

sesionRouter.get('/sesion', (req, res) => sesionController.estado(req, res));
sesionRouter.post('/sesion', (req, res) => sesionController.abrir(req, res));
sesionRouter.delete('/sesion', (req, res) => sesionController.cerrar(req, res));

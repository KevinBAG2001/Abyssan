import { Router } from 'express';
import { authForjasController } from '../controllers/AuthForjasController.js';

export const authRouter = Router();

authRouter.get('/forjas', (req, res) => authForjasController.listar(req, res));
authRouter.get('/github/iniciar', (req, res) => authForjasController.iniciarGithub(req, res));
authRouter.get('/gitlab/iniciar', (req, res) => authForjasController.iniciarGitlab(req, res));
authRouter.delete('/forjas/:proveedor', (req, res) => authForjasController.desconectar(req, res));

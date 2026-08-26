import { Request, Response } from 'express';
import { CasosUsoForja } from '../../../application/forjas/CasosUsoForja.js';
import { mensajeErrorGit } from '../../../application/git/mensajeErrorGit.js';
import { validarRutaRepositorio } from '../../../infrastructure/seguridad/validarRutaRepositorio.js';
import { codigoHttpDeError, responderExito, responderFallo } from '../respuestaApi.js';

export class ForjasController {
  constructor(private readonly casos: CasosUsoForja) {}

  private responderError(res: Response, error: unknown) {
    responderFallo(res, mensajeErrorGit(error), codigoHttpDeError(error));
  }

  private falta(res: Response, mensaje: string) {
    responderFallo(res, mensaje, 400);
  }

  private repoQuery(req: Request): string | null {
    const crudo = req.query.path as string | undefined;
    return crudo ? validarRutaRepositorio(crudo) : null;
  }

  private repoBody(req: Request): string | null {
    const crudo = req.body?.repoPath as string | undefined;
    return crudo ? validarRutaRepositorio(crudo) : null;
  }

  async listar(req: Request, res: Response) {
    try {
      const repo = this.repoQuery(req);
      if (!repo) return this.falta(res, 'path es requerido');
      const resultado = await this.casos.listarSolicitudes(repo);
      responderExito(res, resultado, 'Solicitudes de la forja');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async diff(req: Request, res: Response) {
    try {
      const repo = this.repoQuery(req);
      if (!repo) return this.falta(res, 'path es requerido');
      const numero = Number(req.params.numero);
      const resultado = await this.casos.obtenerDiff(repo, numero);
      responderExito(res, resultado, 'Diff de la solicitud');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const repo = this.repoBody(req);
      if (!repo) return this.falta(res, 'repoPath es requerido');
      const numero = Number(req.params.numero);
      const { ramaOrigen, esFork } = req.body as { ramaOrigen?: string; esFork?: boolean };
      if (!ramaOrigen) return this.falta(res, 'ramaOrigen es requerido');
      const rama = await this.casos.checkoutSolicitud(repo, numero, ramaOrigen, Boolean(esFork));
      responderExito(res, { rama }, `Checkout en ${rama}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async crear(req: Request, res: Response) {
    try {
      const repo = this.repoBody(req);
      if (!repo) return this.falta(res, 'repoPath es requerido');
      const { titulo, cuerpo, base, cabeza } = req.body as {
        titulo?: string;
        cuerpo?: string;
        base?: string;
        cabeza?: string;
      };
      if (!titulo || !base || !cabeza) return this.falta(res, 'titulo, base y cabeza son requeridos');
      const creada = await this.casos.crearSolicitud(repo, { titulo, cuerpo, base, cabeza });
      responderExito(res, creada, 'Solicitud creada', 201);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }
}

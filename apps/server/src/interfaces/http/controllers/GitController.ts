import { Request, Response } from 'express';
import { GitUseCases } from '../../../application/use-cases/GitUseCases.js';
import {
  obtenerRaizProyectos,
  validarRutaRepositorio,
  validarRutaArchivoEnRepositorio,
  validarDestinoNuevo,
  validarUrlClone,
} from '../../../infrastructure/seguridad/validarRutaRepositorio.js';
import { codigoHttpDeError, responderExito, responderFallo } from '../respuestaApi.js';
import { mensajeErrorGit } from '../../../application/git/mensajeErrorGit.js';
import { exigirConfirmacion } from '../../../infrastructure/seguridad/confirmacionDestructiva.js';

export class GitController {
  constructor(private gitUseCases: GitUseCases) {}

  private responderError(res: Response, error: unknown) {
    const mensaje = mensajeErrorGit(error);
    responderFallo(res, mensaje, codigoHttpDeError(error));
  }

  private falta(res: Response, mensaje: string) {
    responderFallo(res, mensaje, 400);
  }

  private validarRepo(repoPath: string): string {
    return validarRutaRepositorio(repoPath);
  }

  async listRepositories(req: Request, res: Response) {
    try {
      const rootPath = (req.query.root as string) || obtenerRaizProyectos();
      const raizValidada = validarRutaRepositorio(rootPath);
      const repos = await this.gitUseCases.listRepositories(raizValidada);
      responderExito(res, repos, 'Repositorios listados');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const status = await this.gitUseCases.getRepositoryStatus(this.validarRepo(repoPath));
      responderExito(res, status, 'Estado del repositorio');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getCommits(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const limit = parseInt(req.query.limit as string) || 800;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const commits = await this.gitUseCases.getCommitGraph(this.validarRepo(repoPath), limit);
      responderExito(res, commits, 'Grafo de commits');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getBranches(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const branches = await this.gitUseCases.getBranches(this.validarRepo(repoPath));
      responderExito(res, branches, 'Ramas listadas');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async compareBranches(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const base = req.query.base as string;
      const target = req.query.target as string;
      if (!repoPath || !base || !target) {
        return this.falta(res, 'Parámetros path, base y target son requeridos');
      }
      const comparison = await this.gitUseCases.compareBranches(this.validarRepo(repoPath), base, target);
      responderExito(res, comparison, 'Comparación de ramas');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async merge(req: Request, res: Response) {
    try {
      const { repoPath, sourceBranch, noFf } = req.body;
      if (!repoPath || !sourceBranch) {
        return this.falta(res, 'repoPath y sourceBranch son requeridos');
      }
      await this.gitUseCases.merge(this.validarRepo(repoPath), sourceBranch, noFf);
      responderExito(res, {}, `Merge de ${sourceBranch} completado`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getDiff(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const file = req.query.file as string | undefined;
      const staged = req.query.staged === 'true';
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const repoValidado = this.validarRepo(repoPath);
      const archivo = file ? validarRutaArchivoEnRepositorio(repoValidado, file) : undefined;
      const diff = await this.gitUseCases.getDiff(repoValidado, archivo, staged);
      responderExito(res, diff, 'Diff obtenido');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async stage(req: Request, res: Response) {
    try {
      const { repoPath, file, all } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      const repoValidado = this.validarRepo(repoPath);
      const archivo = file ? validarRutaArchivoEnRepositorio(repoValidado, file) : undefined;
      await this.gitUseCases.stage(repoValidado, archivo, all);
      responderExito(res, {}, 'Archivos preparados en staging');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async unstage(req: Request, res: Response) {
    try {
      const { repoPath, file } = req.body;
      if (!repoPath || !file) return this.falta(res, 'repoPath y file son requeridos');
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      await this.gitUseCases.unstage(repoValidado, archivo);
      responderExito(res, {}, 'Archivo removido de staging');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async commit(req: Request, res: Response) {
    try {
      const { repoPath, message, description } = req.body;
      if (!repoPath || !message) return this.falta(res, 'repoPath y message son requeridos');
      const commitHash = await this.gitUseCases.commit(this.validarRepo(repoPath), message, description);
      responderExito(res, { hash: commitHash }, 'Commit realizado exitosamente');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const { repoPath, target } = req.body;
      if (!repoPath || !target) return this.falta(res, 'repoPath y target son requeridos');
      await this.gitUseCases.checkout(this.validarRepo(repoPath), target);
      responderExito(res, {}, `Cambiado a ${target}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async createBranch(req: Request, res: Response) {
    try {
      const { repoPath, branchName, startPoint } = req.body;
      if (!repoPath || !branchName) return this.falta(res, 'repoPath y branchName son requeridos');
      await this.gitUseCases.createBranch(this.validarRepo(repoPath), branchName, startPoint);
      responderExito(res, {}, `Rama ${branchName} creada con éxito`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async pull(req: Request, res: Response) {
    try {
      const { repoPath, modo } = req.body as { repoPath?: string; modo?: 'merge' | 'rebase' };
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      const modoPull = modo === 'rebase' ? 'rebase' : 'merge';
      await this.gitUseCases.pull(this.validarRepo(repoPath), modoPull);
      responderExito(res, {}, `Pull (${modoPull}) completado con éxito`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async push(req: Request, res: Response) {
    try {
      const { repoPath } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.push(this.validarRepo(repoPath));
      responderExito(res, {}, 'Push completado con éxito');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getRemotes(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const remotes = await this.gitUseCases.getRemotes(this.validarRepo(repoPath));
      responderExito(res, remotes, 'Remotos listados');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async addRemote(req: Request, res: Response) {
    try {
      const { repoPath, name, url } = req.body;
      if (!repoPath || !name || !url) {
        return this.falta(res, 'repoPath, name y url son requeridos');
      }
      await this.gitUseCases.addRemote(this.validarRepo(repoPath), name, url);
      responderExito(res, {}, `Remoto ${name} añadido`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async removeRemote(req: Request, res: Response) {
    try {
      const { repoPath, name } = req.body;
      if (!repoPath || !name) {
        return this.falta(res, 'repoPath y name son requeridos');
      }
      await this.gitUseCases.removeRemote(this.validarRepo(repoPath), name);
      responderExito(res, {}, `Remoto ${name} eliminado`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async fetch(req: Request, res: Response) {
    try {
      const { repoPath, prune } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.fetchAll(this.validarRepo(repoPath), prune !== false);
      responderExito(res, {}, 'Fetch completado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getStashes(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const stashes = await this.gitUseCases.getStashes(this.validarRepo(repoPath));
      responderExito(res, stashes, 'Stashes listados');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async saveStash(req: Request, res: Response) {
    try {
      const { repoPath, message } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.saveStash(this.validarRepo(repoPath), message);
      responderExito(res, {}, 'Stash guardado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async popStash(req: Request, res: Response) {
    try {
      const { repoPath, index } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.popStash(this.validarRepo(repoPath), index ?? 0);
      responderExito(res, {}, 'Stash aplicado y removido');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async dropStash(req: Request, res: Response) {
    try {
      const { repoPath, index } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.dropStash(this.validarRepo(repoPath), index ?? 0);
      responderExito(res, {}, 'Stash eliminado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getTags(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const tags = await this.gitUseCases.getTags(this.validarRepo(repoPath));
      responderExito(res, tags, 'Tags listados');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async createTag(req: Request, res: Response) {
    try {
      const { repoPath, tagName, targetHash } = req.body;
      if (!repoPath || !tagName) return this.falta(res, 'repoPath y tagName son requeridos');
      await this.gitUseCases.createTag(this.validarRepo(repoPath), tagName, targetHash);
      responderExito(res, {}, `Tag "${tagName}" creado`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async cherryPick(req: Request, res: Response) {
    try {
      const { repoPath, hash } = req.body;
      if (!repoPath || !hash) return this.falta(res, 'repoPath y hash son requeridos');
      await this.gitUseCases.cherryPick(this.validarRepo(repoPath), hash);
      responderExito(res, {}, `Cherry-pick de ${hash.substring(0, 7)} aplicado`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async revert(req: Request, res: Response) {
    try {
      const { repoPath, hash } = req.body;
      if (!repoPath || !hash) return this.falta(res, 'repoPath y hash son requeridos');
      await this.gitUseCases.revert(this.validarRepo(repoPath), hash);
      responderExito(res, {}, `Commit ${hash.substring(0, 7)} revertido`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async reset(req: Request, res: Response) {
    try {
      const { repoPath, type, target, confirmado } = req.body;
      if (!repoPath || !type || !target) return this.falta(res, 'repoPath, type y target son requeridos');
      if (type === 'hard') exigirConfirmacion(confirmado);
      await this.gitUseCases.reset(this.validarRepo(repoPath), type, target);
      responderExito(res, {}, `Reset (${type}) a ${target} ejecutado`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getConflict(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const file = req.query.file as string;
      if (!repoPath || !file) return this.falta(res, 'Parámetros path y file son requeridos');
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      const conflict = await this.gitUseCases.getConflict(repoValidado, archivo);
      responderExito(res, conflict, 'Conflicto obtenido');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async resolveConflict(req: Request, res: Response) {
    try {
      const { repoPath, file, resolvedContent } = req.body;
      if (!repoPath || !file || resolvedContent === undefined) {
        return this.falta(res, 'repoPath, file y resolvedContent son requeridos');
      }
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      await this.gitUseCases.resolveConflict(repoValidado, archivo, resolvedContent);
      responderExito(res, {}, `Conflicto en ${file} resuelto`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  getLogs(_req: Request, res: Response) {
    const logs = this.gitUseCases.getAuditLogs();
    responderExito(res, logs, 'Log de comandos');
  }

  listarOperaciones(_req: Request, res: Response) {
    responderExito(res, this.gitUseCases.listarOperaciones(), 'Operaciones Git');
  }

  async discardArchivo(req: Request, res: Response) {
    try {
      const { repoPath, file, confirmado } = req.body;
      if (!repoPath || !file) return this.falta(res, 'repoPath y file son requeridos');
      exigirConfirmacion(confirmado);
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      await this.gitUseCases.discardArchivo(repoValidado, archivo);
      responderExito(res, {}, `Cambios de ${archivo} descartados`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async abortarMerge(req: Request, res: Response) {
    try {
      const { repoPath, confirmado } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      exigirConfirmacion(confirmado);
      await this.gitUseCases.abortarMerge(this.validarRepo(repoPath));
      responderExito(res, {}, 'Merge abortado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async continuarMerge(req: Request, res: Response) {
    try {
      const { repoPath } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      await this.gitUseCases.continuarMerge(this.validarRepo(repoPath));
      responderExito(res, {}, 'Merge continuado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async clonarRepositorio(req: Request, res: Response) {
    try {
      const { url, nombreCarpeta } = req.body as { url?: string; nombreCarpeta?: string };
      if (!url || !nombreCarpeta) return this.falta(res, 'url y nombreCarpeta son requeridos');
      const urlValida = validarUrlClone(url);
      const destino = validarDestinoNuevo(nombreCarpeta);
      await this.gitUseCases.clonarRepositorio(urlValida, destino);
      responderExito(res, { path: destino }, `Repositorio clonado en ${nombreCarpeta}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async inicializarRepositorio(req: Request, res: Response) {
    try {
      const { nombreCarpeta } = req.body as { nombreCarpeta?: string };
      if (!nombreCarpeta) return this.falta(res, 'nombreCarpeta es requerido');
      const destino = validarDestinoNuevo(nombreCarpeta);
      await this.gitUseCases.inicializarRepositorio(destino);
      responderExito(res, { path: destino }, `Repositorio inicializado en ${nombreCarpeta}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async deleteLocalBranch(req: Request, res: Response) {
    try {
      const { repoPath, branchName, confirmado } = req.body;
      if (!repoPath || !branchName) return this.falta(res, 'repoPath y branchName son requeridos');
      exigirConfirmacion(confirmado);
      await this.gitUseCases.deleteLocalBranch(this.validarRepo(repoPath), branchName);
      responderExito(res, {}, `Rama ${branchName} eliminada`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async renameLocalBranch(req: Request, res: Response) {
    try {
      const { repoPath, nombreActual, nombreNuevo } = req.body;
      if (!repoPath || !nombreActual || !nombreNuevo) {
        return this.falta(res, 'repoPath, nombreActual y nombreNuevo son requeridos');
      }
      await this.gitUseCases.renameLocalBranch(this.validarRepo(repoPath), nombreActual, nombreNuevo);
      responderExito(res, {}, `Rama renombrada a ${nombreNuevo}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async obtenerInfoAmend(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const info = await this.gitUseCases.obtenerInfoAmend(this.validarRepo(repoPath));
      responderExito(res, info, 'Info de amend');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async enmendarCommit(req: Request, res: Response) {
    try {
      const { repoPath, message, confirmarRemoto } = req.body;
      if (!repoPath || !message) return this.falta(res, 'repoPath y message son requeridos');
      const hash = await this.gitUseCases.enmendarCommit(
        this.validarRepo(repoPath),
        message,
        Boolean(confirmarRemoto)
      );
      responderExito(res, { hash }, 'Commit enmendado');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async obtenerReflog(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const limite = parseInt(req.query.limit as string) || 20;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const entradas = await this.gitUseCases.obtenerReflog(this.validarRepo(repoPath), limite);
      responderExito(res, entradas, 'Reflog');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  obtenerUltimaOperacion(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string | undefined;
      const validado = repoPath ? this.validarRepo(repoPath) : undefined;
      const op = this.gitUseCases.obtenerUltimaOperacion(validado);
      responderExito(res, op, 'Última operación');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  listarJournal(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const entradas = this.gitUseCases.listarJournal(this.validarRepo(repoPath));
      responderExito(res, entradas, 'Journal de operaciones');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async deshacer(req: Request, res: Response) {
    try {
      const { repoPath, id } = req.body;
      if (!repoPath) return this.falta(res, 'repoPath es requerido');
      if (id !== undefined && (typeof id !== 'string' || id.length === 0)) {
        return this.falta(res, 'id de journal inválido');
      }
      await this.gitUseCases.deshacer(this.validarRepo(repoPath), id);
      responderExito(res, {}, 'Operación deshecha');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async obtenerIdentidad(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return this.falta(res, 'Parámetro path es requerido');
      const identidad = await this.gitUseCases.obtenerIdentidad(this.validarRepo(repoPath));
      responderExito(res, identidad, 'Identidad git');
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async configurarIdentidad(req: Request, res: Response) {
    try {
      const { repoPath, nombre, correo, global: esGlobal } = req.body;
      if (!repoPath || !nombre || !correo) {
        return this.falta(res, 'repoPath, nombre y correo son requeridos');
      }
      await this.gitUseCases.configurarIdentidad(this.validarRepo(repoPath), nombre, correo, Boolean(esGlobal));
      responderExito(res, {}, `Identidad configurada (${esGlobal ? 'global' : 'local'})`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async previewOperacion(req: Request, res: Response) {
    try {
      const { repoPath, operacion, sourceBranch, type, target, hash } = req.body;
      if (!repoPath || !operacion) return this.falta(res, 'repoPath y operacion son requeridos');
      const operacionesValidas = ['merge', 'rebase', 'reset', 'cherry-pick', 'revert', 'force-push'];
      if (!operacionesValidas.includes(operacion)) {
        return this.falta(res, `Operación inválida. Válidas: ${operacionesValidas.join(', ')}`);
      }
      const preview = await this.gitUseCases.previewOperacion(
        this.validarRepo(repoPath),
        operacion,
        { sourceBranch, type, target, hash }
      );
      responderExito(res, preview, `Preview de ${operacion}`);
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }
}

// Controlador HTTP en la Capa de Interfaces (Presentation DDD)
import { Request, Response } from 'express';
import { GitUseCases } from '../../../application/use-cases/GitUseCases.js';
import {
  obtenerRaizProyectos,
  validarRutaRepositorio,
  validarRutaArchivoEnRepositorio,
} from '../../../infrastructure/seguridad/validarRutaRepositorio.js';

export class GitController {
  constructor(private gitUseCases: GitUseCases) {}

  private responderError(res: Response, error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error interno del servidor';
    const esRutaNoAutorizada =
      mensaje.includes('no autorizada') || mensaje.includes('no válida') || mensaje.includes('PROJECTS_ROOT');
    res.status(esRutaNoAutorizada ? 403 : 500).json({ success: false, error: mensaje });
  }

  private validarRepo(repoPath: string): string {
    return validarRutaRepositorio(repoPath);
  }

  async listRepositories(req: Request, res: Response) {
    try {
      const rootPath = (req.query.root as string) || obtenerRaizProyectos();
      const raizValidada = validarRutaRepositorio(rootPath);
      const repos = await this.gitUseCases.listRepositories(raizValidada);
      res.json({ success: true, data: repos });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const status = await this.gitUseCases.getRepositoryStatus(this.validarRepo(repoPath));
      res.json({ success: true, data: status });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getCommits(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const limit = parseInt(req.query.limit as string) || 150;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const commits = await this.gitUseCases.getCommitGraph(this.validarRepo(repoPath), limit);
      res.json({ success: true, data: commits });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getBranches(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const branches = await this.gitUseCases.getBranches(this.validarRepo(repoPath));
      res.json({ success: true, data: branches });
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
        return res.status(400).json({ success: false, error: 'Parametros path, base y target son requeridos' });
      }
      const comparison = await this.gitUseCases.compareBranches(this.validarRepo(repoPath), base, target);
      res.json({ success: true, data: comparison });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async merge(req: Request, res: Response) {
    try {
      const { repoPath, sourceBranch, noFf } = req.body;
      if (!repoPath || !sourceBranch) {
        return res.status(400).json({ success: false, error: 'repoPath y sourceBranch son requeridos' });
      }
      await this.gitUseCases.merge(this.validarRepo(repoPath), sourceBranch, noFf);
      res.json({ success: true, message: `Merge de ${sourceBranch} completado` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getDiff(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const file = req.query.file as string | undefined;
      const staged = req.query.staged === 'true';
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const repoValidado = this.validarRepo(repoPath);
      const archivo = file ? validarRutaArchivoEnRepositorio(repoValidado, file) : undefined;
      const diff = await this.gitUseCases.getDiff(repoValidado, archivo, staged);
      res.json({ success: true, data: diff });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async stage(req: Request, res: Response) {
    try {
      const { repoPath, file, all } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      const repoValidado = this.validarRepo(repoPath);
      const archivo = file ? validarRutaArchivoEnRepositorio(repoValidado, file) : undefined;
      await this.gitUseCases.stage(repoValidado, archivo, all);
      res.json({ success: true, message: 'Archivos preparados en staging' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async unstage(req: Request, res: Response) {
    try {
      const { repoPath, file } = req.body;
      if (!repoPath || !file) return res.status(400).json({ success: false, error: 'repoPath y file son requeridos' });
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      await this.gitUseCases.unstage(repoValidado, archivo);
      res.json({ success: true, message: 'Archivo removido de staging' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async commit(req: Request, res: Response) {
    try {
      const { repoPath, message, description } = req.body;
      if (!repoPath || !message) return res.status(400).json({ success: false, error: 'repoPath y message son requeridos' });
      const commitHash = await this.gitUseCases.commit(this.validarRepo(repoPath), message, description);
      res.json({ success: true, data: { hash: commitHash }, message: 'Commit realizado exitosamente' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const { repoPath, target } = req.body;
      if (!repoPath || !target) return res.status(400).json({ success: false, error: 'repoPath y target son requeridos' });
      await this.gitUseCases.checkout(this.validarRepo(repoPath), target);
      res.json({ success: true, message: `Cambiado a ${target}` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async createBranch(req: Request, res: Response) {
    try {
      const { repoPath, branchName, startPoint } = req.body;
      if (!repoPath || !branchName) return res.status(400).json({ success: false, error: 'repoPath y branchName son requeridos' });
      await this.gitUseCases.createBranch(this.validarRepo(repoPath), branchName, startPoint);
      res.json({ success: true, message: `Rama ${branchName} creada con exito` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async pull(req: Request, res: Response) {
    try {
      const { repoPath } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.pull(this.validarRepo(repoPath));
      res.json({ success: true, message: 'Pull completado con exito' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async push(req: Request, res: Response) {
    try {
      const { repoPath } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.push(this.validarRepo(repoPath));
      res.json({ success: true, message: 'Push completado con exito' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getRemotes(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const remotes = await this.gitUseCases.getRemotes(this.validarRepo(repoPath));
      res.json({ success: true, data: remotes });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async addRemote(req: Request, res: Response) {
    try {
      const { repoPath, name, url } = req.body;
      if (!repoPath || !name || !url) {
        return res.status(400).json({ success: false, error: 'repoPath, name y url son requeridos' });
      }
      await this.gitUseCases.addRemote(this.validarRepo(repoPath), name, url);
      res.json({ success: true, message: `Remoto ${name} anadido` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async removeRemote(req: Request, res: Response) {
    try {
      const { repoPath, name } = req.body;
      if (!repoPath || !name) {
        return res.status(400).json({ success: false, error: 'repoPath y name son requeridos' });
      }
      await this.gitUseCases.removeRemote(this.validarRepo(repoPath), name);
      res.json({ success: true, message: `Remoto ${name} eliminado` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async fetch(req: Request, res: Response) {
    try {
      const { repoPath, prune } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.fetchAll(this.validarRepo(repoPath), prune !== false);
      res.json({ success: true, message: 'Fetch completado' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getStashes(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const stashes = await this.gitUseCases.getStashes(this.validarRepo(repoPath));
      res.json({ success: true, data: stashes });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async saveStash(req: Request, res: Response) {
    try {
      const { repoPath, message } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.saveStash(this.validarRepo(repoPath), message);
      res.json({ success: true, message: 'Stash guardado' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async popStash(req: Request, res: Response) {
    try {
      const { repoPath, index } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.popStash(this.validarRepo(repoPath), index ?? 0);
      res.json({ success: true, message: 'Stash aplicado y removido' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async dropStash(req: Request, res: Response) {
    try {
      const { repoPath, index } = req.body;
      if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath es requerido' });
      await this.gitUseCases.dropStash(this.validarRepo(repoPath), index ?? 0);
      res.json({ success: true, message: 'Stash eliminado' });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getTags(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      if (!repoPath) return res.status(400).json({ success: false, error: 'Parametro path es requerido' });
      const tags = await this.gitUseCases.getTags(this.validarRepo(repoPath));
      res.json({ success: true, data: tags });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async createTag(req: Request, res: Response) {
    try {
      const { repoPath, tagName, targetHash } = req.body;
      if (!repoPath || !tagName) return res.status(400).json({ success: false, error: 'repoPath y tagName son requeridos' });
      await this.gitUseCases.createTag(this.validarRepo(repoPath), tagName, targetHash);
      res.json({ success: true, message: `Tag "${tagName}" creado` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async cherryPick(req: Request, res: Response) {
    try {
      const { repoPath, hash } = req.body;
      if (!repoPath || !hash) return res.status(400).json({ success: false, error: 'repoPath y hash son requeridos' });
      await this.gitUseCases.cherryPick(this.validarRepo(repoPath), hash);
      res.json({ success: true, message: `Cherry-pick de ${hash.substring(0, 7)} aplicado` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async revert(req: Request, res: Response) {
    try {
      const { repoPath, hash } = req.body;
      if (!repoPath || !hash) return res.status(400).json({ success: false, error: 'repoPath y hash son requeridos' });
      await this.gitUseCases.revert(this.validarRepo(repoPath), hash);
      res.json({ success: true, message: `Commit ${hash.substring(0, 7)} revertido` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async reset(req: Request, res: Response) {
    try {
      const { repoPath, type, target } = req.body;
      if (!repoPath || !type || !target) return res.status(400).json({ success: false, error: 'repoPath, type y target son requeridos' });
      await this.gitUseCases.reset(this.validarRepo(repoPath), type, target);
      res.json({ success: true, message: `Reset (${type}) a ${target} ejecutado` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async getConflict(req: Request, res: Response) {
    try {
      const repoPath = req.query.path as string;
      const file = req.query.file as string;
      if (!repoPath || !file) return res.status(400).json({ success: false, error: 'Parametros path y file son requeridos' });
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      const conflict = await this.gitUseCases.getConflict(repoValidado, archivo);
      res.json({ success: true, data: conflict });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  async resolveConflict(req: Request, res: Response) {
    try {
      const { repoPath, file, resolvedContent } = req.body;
      if (!repoPath || !file || resolvedContent === undefined) {
        return res.status(400).json({ success: false, error: 'repoPath, file y resolvedContent son requeridos' });
      }
      const repoValidado = this.validarRepo(repoPath);
      const archivo = validarRutaArchivoEnRepositorio(repoValidado, file);
      await this.gitUseCases.resolveConflict(repoValidado, archivo, resolvedContent);
      res.json({ success: true, message: `Conflicto en ${file} resuelto` });
    } catch (error: unknown) {
      this.responderError(res, error);
    }
  }

  getLogs(req: Request, res: Response) {
    const logs = this.gitUseCases.getAuditLogs();
    res.json({ success: true, data: logs });
  }
}

import {
  CommitModel,
  BranchModel,
  RepositoryStatusModel,
  RepositorySummaryModel,
  StashModel,
  TagModel,
  RemoteModel,
  BranchComparisonModel,
  ConflictModel,
  CommandLogModel,
  GitOperacionModel,
  PreviewOperacionModel,
  TipoOperacionPreview,
  EntradaJournal,
} from '../../domain/models/GitModels.js';
import { tokenInstanciaCliente } from '../config/entornoCliente.js';

export type InfoAmend = {
  esNuestro: boolean;
  estaEnRemoto: boolean;
  mensaje: string;
  hash: string;
};

export type EntradaReflog = {
  hash: string;
  selector: string;
  mensaje: string;
  fecha: string;
};

export type UltimaOperacion = {
  id?: string;
  tipo?: string;
  repoPath?: string;
  descripcion?: string;
  puedeDeshacer: boolean;
  motivoBloqueo?: string;
  comandoGit?: string;
  estadoAnterior?: string;
  timestamp?: string;
};

export type CuentaForja = { proveedor: 'github' | 'gitlab'; usuario?: string };

export type OriginForja = {
  proveedor: 'github' | 'gitlab';
  propietario: string;
  repositorio: string;
  idApi: string;
};

export type SolicitudForja = {
  proveedor: 'github' | 'gitlab';
  numero: number;
  titulo: string;
  estado: string;
  ramaOrigen: string;
  ramaDestino: string;
  autor: string;
  url: string;
  esFork: boolean;
  shaCabeza: string;
};

export type SolicitudForjaCreada = {
  numero: number;
  url: string;
  titulo: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_INSTANCIA = tokenInstanciaCliente;

type Envelope<T> = {
  exito: boolean;
  mensaje: string;
  datos: T;
  meta?: Record<string, unknown>;
};

export class HttpGitApi {
  private cabeceras(extra?: HeadersInit): Headers {
    const headers = new Headers(extra);
    if (TOKEN_INSTANCIA) {
      headers.set('Authorization', `Bearer ${TOKEN_INSTANCIA}`);
    }
    return headers;
  }

  private async pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${ruta}`, {
      ...init,
      headers: this.cabeceras(init?.headers),
    });
    if (!res.ok) {
      let mensaje = `Error HTTP ${res.status}`;
      try {
        const cuerpo = (await res.json()) as Envelope<T>;
        if (cuerpo.mensaje) mensaje = cuerpo.mensaje;
      } catch {
        /* cuerpo no JSON */
      }
      throw new Error(mensaje);
    }
    const cuerpo = (await res.json()) as Envelope<T>;
    if (!cuerpo.exito) {
      throw new Error(cuerpo.mensaje || `Error HTTP ${res.status}`);
    }
    return cuerpo.datos;
  }

  private post(ruta: string, body: unknown): Promise<unknown> {
    return this.pedir(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async getRepos(root?: string): Promise<RepositorySummaryModel[]> {
    const qs = root ? `?root=${encodeURIComponent(root)}` : '';
    return this.pedir(`/api/git/repos${qs}`);
  }

  async getStatus(repoPath: string): Promise<RepositoryStatusModel> {
    return this.pedir(`/api/git/status?path=${encodeURIComponent(repoPath)}`);
  }

  async getCommits(repoPath: string, limit = 800): Promise<CommitModel[]> {
    return this.pedir(
      `/api/git/commits?path=${encodeURIComponent(repoPath)}&limit=${limit}`
    );
  }

  async getBranches(repoPath: string): Promise<BranchModel[]> {
    return this.pedir(`/api/git/branches?path=${encodeURIComponent(repoPath)}`);
  }

  async compareBranches(
    repoPath: string,
    baseBranch: string,
    targetBranch: string
  ): Promise<BranchComparisonModel> {
    return this.pedir(
      `/api/git/branches/compare?path=${encodeURIComponent(repoPath)}&base=${encodeURIComponent(
        baseBranch
      )}&target=${encodeURIComponent(targetBranch)}`
    );
  }

  async merge(repoPath: string, sourceBranch: string, noFf = false): Promise<void> {
    await this.post('/api/git/merge', { repoPath, sourceBranch, noFf });
  }

  async getDiff(repoPath: string, file?: string, staged = false): Promise<string> {
    let url = `/api/git/diff?path=${encodeURIComponent(repoPath)}&staged=${staged}`;
    if (file) url += `&file=${encodeURIComponent(file)}`;
    return this.pedir(url);
  }

  async stage(repoPath: string, file?: string, all = false): Promise<void> {
    await this.post('/api/git/stage', { repoPath, file, all });
  }

  async unstage(repoPath: string, file: string): Promise<void> {
    await this.post('/api/git/unstage', { repoPath, file });
  }

  async commit(repoPath: string, message: string, description?: string): Promise<string> {
    const datos = await this.pedir<{ hash: string }>('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, message, description }),
    });
    return datos.hash;
  }

  async checkout(repoPath: string, target: string): Promise<void> {
    await this.post('/api/git/checkout', { repoPath, target });
  }

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    await this.post('/api/git/branch', { repoPath, branchName, startPoint });
  }

  async pull(repoPath: string, modo: 'merge' | 'rebase' = 'merge'): Promise<void> {
    await this.post('/api/git/pull', { repoPath, modo });
  }

  async push(repoPath: string): Promise<void> {
    await this.post('/api/git/push', { repoPath });
  }

  async getRemotes(repoPath: string): Promise<RemoteModel[]> {
    return this.pedir(`/api/git/remotes?path=${encodeURIComponent(repoPath)}`);
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    await this.post('/api/git/remote/add', { repoPath, name, url });
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
    await this.post('/api/git/remote/remove', { repoPath, name });
  }

  async fetchAll(repoPath: string, prune = true): Promise<void> {
    await this.post('/api/git/fetch', { repoPath, prune });
  }

  async getStashes(repoPath: string): Promise<StashModel[]> {
    return this.pedir(`/api/git/stashes?path=${encodeURIComponent(repoPath)}`);
  }

  async saveStash(repoPath: string, message?: string): Promise<void> {
    await this.post('/api/git/stash/save', { repoPath, message });
  }

  async popStash(repoPath: string, index = 0): Promise<void> {
    await this.post('/api/git/stash/pop', { repoPath, index });
  }

  async dropStash(repoPath: string, index = 0): Promise<void> {
    await this.post('/api/git/stash/drop', { repoPath, index });
  }

  async getTags(repoPath: string): Promise<TagModel[]> {
    return this.pedir(`/api/git/tags?path=${encodeURIComponent(repoPath)}`);
  }

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    await this.post('/api/git/tag', { repoPath, tagName, targetHash });
  }

  async cherryPick(repoPath: string, hash: string): Promise<void> {
    await this.post('/api/git/cherry-pick', { repoPath, hash });
  }

  async revert(repoPath: string, hash: string): Promise<void> {
    await this.post('/api/git/revert', { repoPath, hash });
  }

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    await this.post('/api/git/reset', {
      repoPath,
      type,
      target,
      confirmado: type === 'hard',
    });
  }

  async getConflict(repoPath: string, file: string): Promise<ConflictModel> {
    return this.pedir(
      `/api/git/conflict?path=${encodeURIComponent(repoPath)}&file=${encodeURIComponent(file)}`
    );
  }

  async resolveConflict(repoPath: string, file: string, resolvedContent: string): Promise<void> {
    await this.post('/api/git/conflict/resolve', { repoPath, file, resolvedContent });
  }

  async getLogs(): Promise<CommandLogModel[]> {
    return this.pedir('/api/git/logs');
  }

  async getOperaciones(): Promise<GitOperacionModel[]> {
    return this.pedir('/api/git/operaciones');
  }

  async obtenerIdentidad(repoPath: string): Promise<{ nombre: string; correo: string; alcance: 'local' | 'global' }> {
    return this.pedir(`/api/git/identity?path=${encodeURIComponent(repoPath)}`);
  }

  async configurarIdentidad(
    repoPath: string,
    nombre: string,
    correo: string,
    global = false
  ): Promise<void> {
    await this.post('/api/git/identity', { repoPath, nombre, correo, global });
  }

  async previewOperacion(
    repoPath: string,
    operacion: TipoOperacionPreview,
    params: { sourceBranch?: string; type?: 'soft' | 'mixed' | 'hard'; target?: string; hash?: string } = {}
  ): Promise<PreviewOperacionModel> {
    return this.pedir('/api/git/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, operacion, ...params }),
    });
  }

  async discardArchivo(repoPath: string, file: string): Promise<void> {
    await this.post('/api/git/discard', { repoPath, file, confirmado: true });
  }

  async abortarMerge(repoPath: string): Promise<void> {
    await this.post('/api/git/merge/abort', { repoPath, confirmado: true });
  }

  async continuarMerge(repoPath: string): Promise<void> {
    await this.post('/api/git/merge/continue', { repoPath });
  }

  async clonarRepositorio(url: string, nombreCarpeta: string): Promise<{ path: string }> {
    return this.pedir('/api/git/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, nombreCarpeta }),
    });
  }

  async inicializarRepositorio(nombreCarpeta: string): Promise<{ path: string }> {
    return this.pedir('/api/git/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreCarpeta }),
    });
  }

  async deleteLocalBranch(repoPath: string, branchName: string): Promise<void> {
    await this.post('/api/git/branch/delete', { repoPath, branchName, confirmado: true });
  }

  async renameLocalBranch(repoPath: string, nombreActual: string, nombreNuevo: string): Promise<void> {
    await this.post('/api/git/branch/rename', { repoPath, nombreActual, nombreNuevo });
  }

  async getAmendInfo(repoPath: string): Promise<InfoAmend> {
    return this.pedir(`/api/git/amend-info?path=${encodeURIComponent(repoPath)}`);
  }

  async amend(repoPath: string, message: string, confirmarRemoto = false): Promise<string> {
    const datos = await this.pedir<{ hash: string }>('/api/git/amend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, message, confirmarRemoto }),
    });
    return datos.hash;
  }

  async getReflog(repoPath: string, limit = 20): Promise<EntradaReflog[]> {
    return this.pedir(`/api/git/reflog?path=${encodeURIComponent(repoPath)}&limit=${limit}`);
  }

  async getUltimaOperacion(repoPath: string): Promise<UltimaOperacion> {
    return this.pedir(`/api/git/deshacer?path=${encodeURIComponent(repoPath)}`);
  }

  async getJournal(repoPath: string): Promise<EntradaJournal[]> {
    return this.pedir(`/api/git/journal?path=${encodeURIComponent(repoPath)}`);
  }

  async deshacer(repoPath: string, id?: string): Promise<void> {
    await this.post('/api/git/deshacer', { repoPath, ...(id ? { id } : {}) });
  }

  async listarForjas(): Promise<{
    cuentas: CuentaForja[];
    githubConfigurado: boolean;
    gitlabConfigurado: boolean;
  }> {
    return this.pedir('/api/auth/forjas');
  }

  async iniciarOAuth(proveedor: 'github' | 'gitlab'): Promise<string> {
    const datos = await this.pedir<{ url: string }>(`/api/auth/${proveedor}/iniciar`);
    return datos.url;
  }

  async desconectarForja(proveedor: 'github' | 'gitlab'): Promise<void> {
    await this.pedir(`/api/auth/forjas/${proveedor}`, { method: 'DELETE' });
  }

  async listarSolicitudesForja(repoPath: string): Promise<{
    origin: OriginForja;
    solicitudes: SolicitudForja[];
  }> {
    return this.pedir(`/api/forjas/solicitudes?path=${encodeURIComponent(repoPath)}`);
  }

  async diffSolicitudForja(
    repoPath: string,
    numero: number
  ): Promise<{ origin: OriginForja; diff: string }> {
    return this.pedir(`/api/forjas/solicitudes/${numero}/diff?path=${encodeURIComponent(repoPath)}`);
  }

  async checkoutSolicitudForja(
    repoPath: string,
    numero: number,
    ramaOrigen: string,
    esFork: boolean
  ): Promise<string> {
    const datos = await this.pedir<{ rama: string }>(`/api/forjas/solicitudes/${numero}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, ramaOrigen, esFork }),
    });
    return datos.rama;
  }

  async crearSolicitudForja(
    repoPath: string,
    entrada: { titulo: string; cuerpo?: string; base: string; cabeza: string }
  ): Promise<SolicitudForjaCreada> {
    return this.pedir(`/api/forjas/solicitudes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, ...entrada }),
    });
  }
}

export const httpGitApi = new HttpGitApi();

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
} from '../../domain/models/GitModels.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_INSTANCIA = import.meta.env.VITE_ABYSSAN_API_TOKEN as string | undefined;

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

  async getCommits(repoPath: string, limit = 150): Promise<CommitModel[]> {
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

  async pull(repoPath: string): Promise<void> {
    await this.post('/api/git/pull', { repoPath });
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
    await this.post('/api/git/reset', { repoPath, type, target });
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
}

export const httpGitApi = new HttpGitApi();

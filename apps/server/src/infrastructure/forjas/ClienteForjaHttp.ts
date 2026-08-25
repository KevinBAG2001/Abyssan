import { ErrorForja, MENSAJE_FORJA_CAIDA } from '../../application/forjas/ErrorForja.js';
import type { SolicitudCreada, SolicitudForja } from '../../domain/entities/ForjaEntities.js';
import type { OriginForja } from './parsearOriginForja.js';

type FetchFn = typeof fetch;

const TIMEOUT_MS = 10_000;
const UA = 'Abyssan';

export class ClienteForjaHttp {
  constructor(private readonly fetchFn: FetchFn = fetch) {}

  async listar(origin: OriginForja, token: string): Promise<SolicitudForja[]> {
    if (origin.proveedor === 'github') {
      const raw = await this.pedirJson<GithubPull[]>(
        `https://api.github.com/repos/${origin.idApi}/pulls?state=open&per_page=40`,
        token
      );
      return raw.map((p) => this.mapearGithub(p));
    }
    const raw = await this.pedirJson<GitlabMr[]>(
      `https://gitlab.com/api/v4/projects/${origin.idApi}/merge_requests?state=opened&per_page=40`,
      token
    );
    return raw.map((m) => this.mapearGitlab(m));
  }

  async obtenerDiff(origin: OriginForja, numero: number, token: string): Promise<string> {
    if (origin.proveedor === 'github') {
      return this.pedirTexto(
        `https://api.github.com/repos/${origin.idApi}/pulls/${numero}`,
        token,
        { Accept: 'application/vnd.github.diff' }
      );
    }
    const cuerpo = await this.pedirJson<{ diff?: string }[]>(
      `https://gitlab.com/api/v4/projects/${origin.idApi}/merge_requests/${numero}/diffs`,
      token
    );
    const diffs = (Array.isArray(cuerpo) ? cuerpo : []).map((c) => c.diff || '').filter(Boolean);
    return diffs.join('\n') || 'Sin diff disponible en este MR.';
  }

  async crear(
    origin: OriginForja,
    token: string,
    entrada: { titulo: string; cuerpo?: string; base: string; cabeza: string }
  ): Promise<SolicitudCreada> {
    if (origin.proveedor === 'github') {
      const creado = await this.pedirJson<GithubPull>(
        `https://api.github.com/repos/${origin.idApi}/pulls`,
        token,
        {},
        {
          method: 'POST',
          body: JSON.stringify({
            title: entrada.titulo,
            body: entrada.cuerpo || '',
            head: entrada.cabeza,
            base: entrada.base,
          }),
        }
      );
      return { numero: creado.number, url: creado.html_url, titulo: creado.title };
    }
    const creado = await this.pedirJson<GitlabMr>(
      `https://gitlab.com/api/v4/projects/${origin.idApi}/merge_requests`,
      token,
      {},
      {
        method: 'POST',
        body: JSON.stringify({
          title: entrada.titulo,
          description: entrada.cuerpo || '',
          source_branch: entrada.cabeza,
          target_branch: entrada.base,
        }),
      }
    );
    return { numero: creado.iid, url: creado.web_url, titulo: creado.title };
  }

  private mapearGithub(p: GithubPull): SolicitudForja {
    const baseRepo = p.base?.repo?.full_name || '';
    const headRepo = p.head?.repo?.full_name || '';
    return {
      proveedor: 'github',
      numero: p.number,
      titulo: p.title,
      estado: p.state,
      ramaOrigen: p.head?.ref || '',
      ramaDestino: p.base?.ref || '',
      autor: p.user?.login || '',
      url: p.html_url,
      esFork: Boolean(headRepo && baseRepo && headRepo !== baseRepo),
      shaCabeza: p.head?.sha || '',
    };
  }

  private mapearGitlab(m: GitlabMr): SolicitudForja {
    return {
      proveedor: 'gitlab',
      numero: m.iid,
      titulo: m.title,
      estado: m.state,
      ramaOrigen: m.source_branch,
      ramaDestino: m.target_branch,
      autor: m.author?.username || '',
      url: m.web_url,
      esFork: Boolean(m.source_project_id && m.target_project_id && m.source_project_id !== m.target_project_id),
      shaCabeza: m.sha || '',
    };
  }

  private async pedirJson<T>(
    url: string,
    token: string,
    extraHeaders: Record<string, string> = {},
    init: RequestInit = {}
  ): Promise<T> {
    const res = await this.pedir(url, token, extraHeaders, init);
    try {
      return (await res.json()) as T;
    } catch {
      throw new ErrorForja(MENSAJE_FORJA_CAIDA, 503);
    }
  }

  private async pedirTexto(
    url: string,
    token: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<string> {
    const res = await this.pedir(url, token, extraHeaders);
    return res.text();
  }

  private async pedir(
    url: string,
    token: string,
    extraHeaders: Record<string, string> = {},
    init: RequestInit = {}
  ): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: extraHeaders.Accept || 'application/json',
          'User-Agent': UA,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
      });
    } catch {
      throw new ErrorForja(MENSAJE_FORJA_CAIDA, 503);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ErrorForja(
        'Token de forja inválido o sin permiso. Reconecta GitHub/GitLab. El Git local no se ve afectado.',
        401
      );
    }
    if (res.status === 404) {
      throw new ErrorForja('La forja no encontró el repositorio o la solicitud.', 404);
    }
    if (res.status === 409 || res.status === 422) {
      throw new ErrorForja(
        'La forja rechazó la solicitud (rama ausente en el remoto, duplicada o inválida).',
        400
      );
    }
    if (!res.ok) {
      throw new ErrorForja(
        `La forja respondió ${res.status}. Commit y push locales siguen disponibles.`,
        502
      );
    }
    return res;
  }
}

type GithubPull = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user?: { login?: string };
  head?: { ref?: string; sha?: string; repo?: { full_name?: string } };
  base?: { ref?: string; repo?: { full_name?: string } };
};

type GitlabMr = {
  iid: number;
  title: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
  sha?: string;
  source_project_id?: number;
  target_project_id?: number;
  author?: { username?: string };
};

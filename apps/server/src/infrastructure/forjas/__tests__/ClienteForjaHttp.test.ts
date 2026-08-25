import { describe, it, expect, vi } from 'vitest';
import { ClienteForjaHttp } from '../ClienteForjaHttp.js';
import { ErrorForja, MENSAJE_FORJA_CAIDA } from '../../../application/forjas/ErrorForja.js';
import type { OriginForja } from '../parsearOriginForja.js';

const originGithub: OriginForja = {
  proveedor: 'github',
  propietario: 'acme',
  repositorio: 'abyssan',
  idApi: 'acme/abyssan',
};

const originGitlab: OriginForja = {
  proveedor: 'gitlab',
  propietario: 'acme',
  repositorio: 'abyssan',
  idApi: encodeURIComponent('acme/abyssan'),
};

function jsonRespuesta(cuerpo: unknown, status = 200, extra: Partial<Response> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
    text: async () => (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
    ...extra,
  } as Response;
}

describe('ClienteForjaHttp', () => {
  it('mapea PRs abiertos de GitHub', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonRespuesta([
        {
          number: 7,
          title: 'Fix staging',
          state: 'open',
          html_url: 'https://github.com/acme/abyssan/pull/7',
          user: { login: 'kevin' },
          head: { ref: 'fix', sha: 'abc', repo: { full_name: 'acme/abyssan' } },
          base: { ref: 'main', repo: { full_name: 'acme/abyssan' } },
        },
      ])
    );
    const cliente = new ClienteForjaHttp(fetchFn as unknown as typeof fetch);
    const lista = await cliente.listar(originGithub, 'token-secreto');
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      proveedor: 'github',
      numero: 7,
      ramaOrigen: 'fix',
      ramaDestino: 'main',
      esFork: false,
    });
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer token-secreto');
  });

  it('mapea MRs abiertos de GitLab', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonRespuesta([
        {
          iid: 3,
          title: 'Docs',
          state: 'opened',
          web_url: 'https://gitlab.com/acme/abyssan/-/merge_requests/3',
          source_branch: 'docs',
          target_branch: 'main',
          sha: 'def',
          source_project_id: 1,
          target_project_id: 1,
          author: { username: 'kevin' },
        },
      ])
    );
    const cliente = new ClienteForjaHttp(fetchFn as unknown as typeof fetch);
    const lista = await cliente.listar(originGitlab, 'gl-token');
    expect(lista[0]).toMatchObject({ proveedor: 'gitlab', numero: 3, ramaOrigen: 'docs', esFork: false });
  });

  it('convierte timeout o red caída en ErrorForja 503 sin filtrar el token', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const cliente = new ClienteForjaHttp(fetchFn as unknown as typeof fetch);
    const token = 'super-secreto-xyz';
    await expect(cliente.listar(originGithub, token)).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ErrorForja);
      expect((err as ErrorForja).codigoHttp).toBe(503);
      expect((err as Error).message).toBe(MENSAJE_FORJA_CAIDA);
      expect((err as Error).message).not.toContain(token);
      return true;
    });
  });

  it('mapea 5xx de la forja a 502 y no bloquea el mensaje de Git local', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonRespuesta({ message: 'boom' }, 502));
    const cliente = new ClienteForjaHttp(fetchFn as unknown as typeof fetch);
    await expect(cliente.listar(originGithub, 'tok')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ErrorForja);
      expect((err as ErrorForja).codigoHttp).toBe(502);
      expect((err as Error).message).toMatch(/locales siguen disponibles/);
      return true;
    });
  });

  it('crea un PR en GitHub con head/base', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonRespuesta({
        number: 12,
        title: 'Nueva feature',
        html_url: 'https://github.com/acme/abyssan/pull/12',
      })
    );
    const cliente = new ClienteForjaHttp(fetchFn as unknown as typeof fetch);
    const creado = await cliente.crear(originGithub, 'tok', {
      titulo: 'Nueva feature',
      base: 'main',
      cabeza: 'feat',
    });
    expect(creado.numero).toBe(12);
    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body).toMatchObject({ title: 'Nueva feature', head: 'feat', base: 'main' });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { CasosUsoForja } from '../CasosUsoForja.js';
import { ErrorForja } from '../ErrorForja.js';
import { ClienteForjaHttp } from '../../../infrastructure/forjas/ClienteForjaHttp.js';
import type { IGitRepository } from '../../../domain/repositories/IGitRepository.js';

const originUrl = 'https://github.com/acme/abyssan.git';

function gitParcial(extra: Partial<IGitRepository> = {}): IGitRepository {
  return {
    getRemotes: vi.fn().mockResolvedValue([
      { name: 'origin', fetchUrl: originUrl, pushUrl: originUrl },
    ]),
    fetchRefspec: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn(),
    push: vi.fn(),
    ...extra,
  } as unknown as IGitRepository;
}

describe('CasosUsoForja', () => {
  it('exige OAuth sin tocar commit ni push locales', async () => {
    const git = gitParcial();
    const casos = new CasosUsoForja(git, new ClienteForjaHttp(vi.fn() as unknown as typeof fetch), {
      obtener: () => undefined,
    });
    await expect(casos.listarSolicitudes('/repo')).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ErrorForja);
      expect((err as ErrorForja).codigoHttp).toBe(401);
      return true;
    });
    expect(git.commit).not.toHaveBeenCalled();
    expect(git.push).not.toHaveBeenCalled();
  });

  it('rechaza origin que no es GitHub/GitLab', async () => {
    const git = gitParcial({
      getRemotes: vi.fn().mockResolvedValue([
        { name: 'origin', fetchUrl: 'https://bitbucket.org/a/b.git', pushUrl: '' },
      ]),
    });
    const casos = new CasosUsoForja(git, new ClienteForjaHttp(), { obtener: () => ({ token: 'x' }) });
    await expect(casos.listarSolicitudes('/repo')).rejects.toBeInstanceOf(ErrorForja);
    expect(git.commit).not.toHaveBeenCalled();
  });

  it('listar no muta el repositorio local', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      text: async () => '[]',
    } as Response);
    const git = gitParcial();
    const casos = new CasosUsoForja(git, new ClienteForjaHttp(fetchFn as unknown as typeof fetch), {
      obtener: () => ({ token: 'tok' }),
    });
    const { origin, solicitudes } = await casos.listarSolicitudes('/repo');
    expect(origin.proveedor).toBe('github');
    expect(solicitudes).toEqual([]);
    expect(git.fetchRefspec).not.toHaveBeenCalled();
    expect(git.checkout).not.toHaveBeenCalled();
    expect(git.commit).not.toHaveBeenCalled();
  });

  it('checkout de un PR fork usa el refspec pull/N/head', async () => {
    const git = gitParcial();
    const casos = new CasosUsoForja(git, new ClienteForjaHttp(), { obtener: () => ({ token: 'tok' }) });
    const rama = await casos.checkoutSolicitud('/repo', 9, 'feature-x', true);
    expect(rama).toBe('abyssan-pr-9');
    expect(git.fetchRefspec).toHaveBeenCalledWith('/repo', 'origin', '+pull/9/head:abyssan-pr-9');
    expect(git.checkout).toHaveBeenCalledWith('/repo', 'abyssan-pr-9');
  });
});

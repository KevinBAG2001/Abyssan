import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { ModalForjas } from '../ModalForjas';
import { httpGitApi } from '../../infrastructure/api/HttpGitApi';

vi.mock('../../infrastructure/api/HttpGitApi', () => ({
  httpGitApi: {
    listarForjas: vi.fn(),
    listarSolicitudesForja: vi.fn(),
    iniciarOAuth: vi.fn(),
    desconectarForja: vi.fn(),
    diffSolicitudForja: vi.fn(),
    checkoutSolicitudForja: vi.fn(),
    crearSolicitudForja: vi.fn(),
  },
}));

const propsBase = {
  repoPath: '/workspace/proyectos/forjas-qa',
  ramaActual: 'main',
  ramas: [{ name: 'main', isRemote: false, current: true, commit: 'abc1234' }],
  onClose: vi.fn(),
  onExito: vi.fn(),
  onCheckoutHecho: vi.fn(),
};

describe('ModalForjas', () => {
  beforeEach(() => {
    vi.mocked(httpGitApi.listarForjas).mockResolvedValue({
      cuentas: [],
      githubConfigurado: false,
      gitlabConfigurado: false,
    });
    vi.mocked(httpGitApi.listarSolicitudesForja).mockRejectedValue(
      new Error('El origin no es una forja soportada (GitHub o GitLab.com).'),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('consulta solicitudes una sola vez aunque el padre re-renderice con onError inestable', async () => {
    function PadreInestable() {
      const [, tick] = useState(0);
      useEffect(() => {
        const id = window.setInterval(() => tick((n) => n + 1), 10);
        return () => window.clearInterval(id);
      }, []);
      return (
        <ModalForjas
          {...propsBase}
          onError={() => {
            /* inline: nueva referencia en cada render, como en App antes del fix */
          }}
        />
      );
    }

    const view = render(<PadreInestable />);

    await waitFor(() => {
      expect(httpGitApi.listarSolicitudesForja).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => window.setTimeout(r, 250));

    expect(httpGitApi.listarSolicitudesForja).toHaveBeenCalledTimes(1);
    expect(httpGitApi.listarForjas).toHaveBeenCalledTimes(1);

    view.unmount();
    await new Promise((r) => window.setTimeout(r, 30));
  });
});

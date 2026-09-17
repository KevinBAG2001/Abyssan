import { describe, it, expect } from 'vitest';
import { MaquinaSesionWs } from '../MaquinaSesionWs.js';

describe('MaquinaSesionWs', () => {
  const tokenOk = (token?: string | null) => token === 'secreto-lan';

  it('en loopback permite WATCH_REPO sin AUTH', () => {
    const sesion = new MaquinaSesionWs(false);
    expect(sesion.autenticado).toBe(true);
    expect(sesion.procesar({ type: 'WATCH_REPO', repoPath: '/repos/uno' }, tokenOk)).toEqual({
      tipo: 'vigilar',
      repoPath: '/repos/uno',
    });
  });

  it('en LAN cierra si WATCH_REPO llega antes de AUTH', () => {
    const sesion = new MaquinaSesionWs(true);
    expect(sesion.autenticado).toBe(false);
    expect(sesion.procesar({ type: 'WATCH_REPO', repoPath: '/repos/uno' }, tokenOk)).toEqual({
      tipo: 'cerrar',
      codigo: 4401,
      razon: 'Token de instancia requerido',
    });
  });

  it('en LAN AUTH válido habilita WATCH_REPO', () => {
    const sesion = new MaquinaSesionWs(true);
    expect(sesion.procesar({ type: 'AUTH', token: 'secreto-lan' }, tokenOk)).toEqual({ tipo: 'auth_ok' });
    expect(sesion.autenticado).toBe(true);
    expect(sesion.procesar({ type: 'WATCH_REPO', repoPath: 'C:/repos/abyssan' }, tokenOk)).toEqual({
      tipo: 'vigilar',
      repoPath: 'C:/repos/abyssan',
    });
  });

  it('en LAN AUTH con token inválido cierra 4401', () => {
    const sesion = new MaquinaSesionWs(true);
    expect(sesion.procesar({ type: 'AUTH', token: 'otro' }, tokenOk)).toEqual({
      tipo: 'cerrar',
      codigo: 4401,
      razon: 'Token de instancia requerido',
    });
    expect(sesion.autenticado).toBe(false);
  });

  it('WATCH_REPO sin repoPath responde error, no cierra', () => {
    const sesion = new MaquinaSesionWs(false);
    expect(sesion.procesar({ type: 'WATCH_REPO' }, tokenOk)).toEqual({
      tipo: 'error',
      message: 'Ruta de repositorio no autorizada',
    });
  });

  it('ignora mensajes que no son AUTH ni WATCH_REPO', () => {
    const sesion = new MaquinaSesionWs(true);
    expect(sesion.procesar({ type: 'PING' }, tokenOk)).toEqual({ tipo: 'ignorar' });
    expect(sesion.procesar(null, tokenOk)).toEqual({ tipo: 'ignorar' });
  });
});

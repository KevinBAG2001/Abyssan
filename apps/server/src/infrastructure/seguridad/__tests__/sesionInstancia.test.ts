import { afterEach, describe, expect, it } from 'vitest';
import {
  cabeceraSetCookieSesion,
  crearSesion,
  extraerCookieSesion,
  NOMBRE_COOKIE_SESION,
  sesionEsValida,
  vaciarSesiones,
} from '../sesionInstancia.js';

describe('sesionInstancia', () => {
  afterEach(() => {
    vaciarSesiones();
  });

  it('crea una sesión válida y rechaza ids inventados', () => {
    const sesion = crearSesion();
    expect(sesionEsValida(sesion.id)).toBe(true);
    expect(sesionEsValida('no-existe')).toBe(false);
    expect(sesionEsValida(undefined)).toBe(false);
  });

  it('expira según el reloj inyectado', () => {
    const ahora = 1_000_000;
    const sesion = crearSesion(ahora);
    expect(sesionEsValida(sesion.id, ahora + 60_000)).toBe(true);
    expect(sesionEsValida(sesion.id, sesion.expira + 1)).toBe(false);
  });

  it('extrae la cookie HttpOnly y arma Set-Cookie', () => {
    const setCookie = cabeceraSetCookieSesion('abc123');
    expect(setCookie).toContain(`${NOMBRE_COOKIE_SESION}=abc123`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(extraerCookieSesion(`${NOMBRE_COOKIE_SESION}=abc123; other=1`)).toBe('abc123');
    expect(extraerCookieSesion('otro=1')).toBeUndefined();
  });
});

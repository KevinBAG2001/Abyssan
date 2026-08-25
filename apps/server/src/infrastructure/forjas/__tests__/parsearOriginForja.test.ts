import { describe, it, expect } from 'vitest';
import { elegirUrlOrigin, parsearOriginForja } from '../parsearOriginForja.js';

describe('parsearOriginForja', () => {
  it('parsea HTTPS de GitHub', () => {
    const o = parsearOriginForja('https://github.com/acme/abyssan.git');
    expect(o).toEqual({
      proveedor: 'github',
      propietario: 'acme',
      repositorio: 'abyssan',
      idApi: 'acme/abyssan',
    });
  });

  it('parsea SSH de GitHub', () => {
    const o = parsearOriginForja('git@github.com:acme/abyssan.git');
    expect(o?.proveedor).toBe('github');
    expect(o?.idApi).toBe('acme/abyssan');
  });

  it('parsea GitLab con subgrupo y URL-encodea el id', () => {
    const o = parsearOriginForja('https://gitlab.com/grupo/sub/proyecto.git');
    expect(o?.proveedor).toBe('gitlab');
    expect(o?.propietario).toBe('grupo/sub');
    expect(o?.repositorio).toBe('proyecto');
    expect(o?.idApi).toBe(encodeURIComponent('grupo/sub/proyecto'));
  });

  it('parsea SSH de GitLab', () => {
    const o = parsearOriginForja('git@gitlab.com:acme/abyssan.git');
    expect(o?.proveedor).toBe('gitlab');
    expect(o?.idApi).toBe(encodeURIComponent('acme/abyssan'));
  });

  it('rechaza forjas que no son GitHub/GitLab.com', () => {
    expect(parsearOriginForja('https://bitbucket.org/acme/abyssan.git')).toBeNull();
    expect(parsearOriginForja('')).toBeNull();
    expect(parsearOriginForja('https://github.com/solo')).toBeNull();
  });

  it('elige origin si existe, si no el primer remoto', () => {
    expect(
      elegirUrlOrigin([
        { name: 'upstream', fetchUrl: 'https://github.com/otro/x.git', pushUrl: '' },
        { name: 'origin', fetchUrl: 'https://github.com/acme/abyssan.git', pushUrl: '' },
      ])
    ).toBe('https://github.com/acme/abyssan.git');
    expect(
      elegirUrlOrigin([{ name: 'gitlab', fetchUrl: 'https://gitlab.com/a/b.git', pushUrl: '' }])
    ).toBe('https://gitlab.com/a/b.git');
    expect(elegirUrlOrigin([])).toBeUndefined();
  });
});

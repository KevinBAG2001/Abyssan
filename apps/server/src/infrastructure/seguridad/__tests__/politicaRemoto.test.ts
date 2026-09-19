import { describe, expect, it } from 'vitest';
import {
  sanitizarRemotoParaMostrar,
  validarDestinoFetch,
  validarDestinoPush,
  validarNombreRemoto,
  validarUrlRemoto,
} from '../politicaRemoto.js';

describe('RemotePolicy', () => {
  it('acepta HTTPS, SSH y scp-like de GitHub/GitLab', () => {
    expect(validarUrlRemoto('https://github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
    expect(validarUrlRemoto('https://gitlab.com/org/repo.git')).toContain('gitlab.com');
    expect(validarUrlRemoto('ssh://git@github.com/org/repo.git')).toContain('ssh://');
    expect(validarUrlRemoto('git@github.com:org/repo.git')).toContain('git@');
  });

  it('rechaza file://, rutas locales, UNC y relativas', () => {
    expect(() => validarDestinoFetch('file:///tmp/repo')).toThrow('file://');
    expect(() => validarDestinoPush('C:\\secret')).toThrow();
    expect(() => validarUrlRemoto('/var/git/repo.git')).toThrow();
    expect(() => validarUrlRemoto('\\\\servidor\\share\\repo.git')).toThrow();
    expect(() => validarUrlRemoto('../otro-repo')).toThrow();
  });

  it('rechaza protocolos peligrosos o no allowlisteados', () => {
    expect(() => validarUrlRemoto('git://github.com/org/repo.git')).toThrow('HTTPS o SSH');
    expect(() => validarUrlRemoto('http://github.com/org/repo.git')).toThrow('HTTPS o SSH');
    expect(() => validarUrlRemoto('ext::sh -c evil')).toThrow('HTTPS o SSH');
    expect(() => validarUrlRemoto('ftp://host/repo.git')).toThrow('HTTPS o SSH');
    expect(() => validarUrlRemoto('protocol.ext::cmd')).toThrow('HTTPS o SSH');
  });

  it('rechaza credenciales embebidas y URLs malformadas', () => {
    expect(() => validarUrlRemoto('https://user:pass@github.com/org/repo.git')).toThrow('credenciales');
    expect(() => validarUrlRemoto('ssh://user:pass@host/repo.git')).toThrow('credenciales');
    expect(() => validarUrlRemoto('https://github.com/org/repo.git\n-u')).toThrow();
    expect(() => validarUrlRemoto('')).toThrow();
  });

  it('validarNombreRemoto acepta origin y rechaza flags', () => {
    expect(validarNombreRemoto('origin')).toBe('origin');
    expect(validarNombreRemoto('upstream_1')).toBe('upstream_1');
    expect(() => validarNombreRemoto('-uorigin')).toThrow();
    expect(() => validarNombreRemoto('origin/main')).toThrow();
  });

  it('sanitizarRemotoParaMostrar quita userinfo HTTP', () => {
    expect(sanitizarRemotoParaMostrar('https://user:pass@github.com/org/repo.git')).toBe(
      'https://github.com/org/repo.git'
    );
    expect(sanitizarRemotoParaMostrar('git@github.com:org/repo.git')).toBe('git@github.com:org/repo.git');
  });
});

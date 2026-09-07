import { describe, expect, it } from 'vitest';
import {
  detectarForja,
  inyectarTokenHttps,
  mensajePushSinCredencial,
  urlHttpsDeRemoto,
} from '../inyectarTokenHttps.js';

describe('urlHttpsDeRemoto', () => {
  it('convierte SSH scp de GitHub a HTTPS', () => {
    expect(urlHttpsDeRemoto('git@github.com:acme/Abyssan.git')).toBe(
      'https://github.com/acme/Abyssan.git'
    );
  });

  it('limpia credenciales embebidas en HTTPS', () => {
    expect(urlHttpsDeRemoto('https://x-access-token:old@github.com/acme/repo.git')).toBe(
      'https://github.com/acme/repo.git'
    );
  });

  it('rechaza hosts que no son forja', () => {
    expect(urlHttpsDeRemoto('https://git.empresa.local/a/b.git')).toBeNull();
  });
});

describe('inyectarTokenHttps', () => {
  it('inyecta token GitHub y no deja el secreto en la forma SSH original', () => {
    const url = inyectarTokenHttps('git@github.com:acme/repo.git', 'gho_secreto', 'github');
    expect(url.startsWith('https://x-access-token:gho_secreto@github.com/')).toBe(true);
  });
});

describe('mensajePushSinCredencial', () => {
  it('explica el hueco de Docker si no hay client OAuth', () => {
    const anteriorId = process.env.GITHUB_CLIENT_ID;
    const anteriorSecret = process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(mensajePushSinCredencial('github')).toMatch(/ABYSSAN_GITHUB_TOKEN/);
    if (anteriorId !== undefined) process.env.GITHUB_CLIENT_ID = anteriorId;
    if (anteriorSecret !== undefined) process.env.GITHUB_CLIENT_SECRET = anteriorSecret;
  });
});

describe('detectarForja', () => {
  it('detecta github en HTTPS', () => {
    expect(detectarForja('https://github.com/acme/repo.git')).toBe('github');
  });
});

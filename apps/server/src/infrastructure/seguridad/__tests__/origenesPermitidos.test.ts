import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extraerOrigin,
  listarOrigenesPermitidos,
  origenDePeticionPermitido,
  origenEstaPermitido,
} from '../origenesPermitidos.js';

describe('orígenes CORS permitidos', () => {
  const original = process.env.CORS_ORIGINS;

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    if (original !== undefined) process.env.CORS_ORIGINS = original;
    else delete process.env.CORS_ORIGINS;
  });

  it('por defecto acepta la SPA en el puerto 5174', () => {
    expect(listarOrigenesPermitidos()).toEqual([
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]);
    expect(origenEstaPermitido('http://localhost:5174')).toBe(true);
    expect(origenEstaPermitido('https://evil.example')).toBe(false);
    expect(origenEstaPermitido('null')).toBe(false);
  });

  it('sin Origin se permite (curl u otro cliente local)', () => {
    expect(origenDePeticionPermitido(undefined)).toBe(true);
  });

  it('CORS_ORIGINS sustituye la lista por defecto', () => {
    process.env.CORS_ORIGINS = 'http://localhost:4173, https://abyssan.local';
    expect(listarOrigenesPermitidos()).toEqual(['http://localhost:4173', 'https://abyssan.local']);
    expect(origenEstaPermitido('http://localhost:5174')).toBe(false);
  });

  it('extraerOrigin lee string o primer valor de array', () => {
    expect(extraerOrigin('http://localhost:5174')).toBe('http://localhost:5174');
    expect(extraerOrigin(['http://localhost:5174', 'otro'])).toBe('http://localhost:5174');
    expect(extraerOrigin(undefined)).toBeUndefined();
  });
});

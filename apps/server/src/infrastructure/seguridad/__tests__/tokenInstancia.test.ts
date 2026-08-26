import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  esBindLoopback,
  extraerTokenBearer,
  tokenEsValido,
  tokenLanEsObligatorio,
  validarConfiguracionToken,
} from '../tokenInstancia.js';

describe('token de instancia LAN (D15)', () => {
  const bindOriginal = process.env.BIND_HOST;
  const tokenOriginal = process.env.ABYSSAN_API_TOKEN;

  beforeEach(() => {
    delete process.env.BIND_HOST;
    delete process.env.ABYSSAN_API_TOKEN;
  });

  afterEach(() => {
    if (bindOriginal !== undefined) process.env.BIND_HOST = bindOriginal;
    else delete process.env.BIND_HOST;
    if (tokenOriginal !== undefined) process.env.ABYSSAN_API_TOKEN = tokenOriginal;
    else delete process.env.ABYSSAN_API_TOKEN;
  });

  it('127.0.0.1 no exige token', () => {
    process.env.BIND_HOST = '127.0.0.1';
    expect(esBindLoopback()).toBe(true);
    expect(tokenLanEsObligatorio()).toBe(false);
    expect(() => validarConfiguracionToken()).not.toThrow();
    expect(tokenEsValido(undefined)).toBe(true);
  });

  it('0.0.0.0 exige ABYSSAN_API_TOKEN', () => {
    process.env.BIND_HOST = '0.0.0.0';
    expect(tokenLanEsObligatorio()).toBe(true);
    expect(() => validarConfiguracionToken()).toThrow('ABYSSAN_API_TOKEN');
  });

  it('acepta Bearer coincidente cuando el bind no es loopback', () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    expect(validarConfiguracionToken()).toBeUndefined();
    expect(tokenEsValido('secreto-lan')).toBe(true);
    expect(tokenEsValido('otro')).toBe(false);
    expect(extraerTokenBearer('Bearer secreto-lan')).toBe('secreto-lan');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  cabenPeticiones,
  reiniciarLimiteTasa,
} from '../limiteTasa.js';
import { esBindLoopback } from '../tokenInstancia.js';

describe('límite de tasa', () => {
  const bindOriginal = process.env.BIND_HOST;

  beforeEach(() => {
    reiniciarLimiteTasa();
    delete process.env.BIND_HOST;
  });

  afterEach(() => {
    if (bindOriginal !== undefined) process.env.BIND_HOST = bindOriginal;
    else delete process.env.BIND_HOST;
  });

  it('localhost no se considera LAN (sin penalizar)', () => {
    process.env.BIND_HOST = '127.0.0.1';
    expect(esBindLoopback()).toBe(true);
  });

  it('rechaza cuando se supera el máximo de la ventana', () => {
    const ahora = 1_000_000;
    for (let i = 0; i < 90; i += 1) {
      expect(cabenPeticiones('10.0.0.8', ahora, 90, 60_000)).toBe(true);
    }
    expect(cabenPeticiones('10.0.0.8', ahora + 10, 90, 60_000)).toBe(false);
  });

  it('otra IP no comparte el cubo', () => {
    const ahora = 2_000_000;
    for (let i = 0; i < 90; i += 1) {
      cabenPeticiones('10.0.0.8', ahora, 90, 60_000);
    }
    expect(cabenPeticiones('10.0.0.9', ahora, 90, 60_000)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { exigirConfirmacion, mensajeConfirmacionRequerida } from '../confirmacionDestructiva.js';

describe('confirmación destructiva', () => {
  it('acepta confirmado === true', () => {
    expect(() => exigirConfirmacion(true)).not.toThrow();
  });

  it('rechaza ausencia, false o strings', () => {
    expect(() => exigirConfirmacion(undefined)).toThrow(mensajeConfirmacionRequerida());
    expect(() => exigirConfirmacion(false)).toThrow(mensajeConfirmacionRequerida());
    expect(() => exigirConfirmacion('true')).toThrow(mensajeConfirmacionRequerida());
    expect(() => exigirConfirmacion(1)).toThrow(mensajeConfirmacionRequerida());
  });
});

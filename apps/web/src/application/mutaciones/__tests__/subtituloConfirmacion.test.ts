import { describe, expect, it } from 'vitest';
import {
  FLECHA_DIRECCION,
  subtituloCherryPick,
  subtituloFusion,
  subtituloReset,
  subtituloRevert,
} from '../subtituloConfirmacion';

describe('subtituloFusion', () => {
  it('muestra origen → destino cuando las ramas difieren', () => {
    expect(subtituloFusion('feature/pagos', 'main')).toBe(
      `feature/pagos ${FLECHA_DIRECCION} main`,
    );
  });

  it('indica rama actual cuando origen y destino coinciden', () => {
    expect(subtituloFusion('main', 'main')).toBe('rama actual: main');
  });

  it('recorta espacios en blanco antes de comparar', () => {
    expect(subtituloFusion('  feature/x  ', ' main ')).toBe(
      `feature/x ${FLECHA_DIRECCION} main`,
    );
  });

  it('tolera entradas vacías sin romper el modal', () => {
    expect(subtituloFusion('', '')).toBe('rama sin nombre');
    expect(subtituloFusion('solo-origen', '')).toBe('solo-origen');
    expect(subtituloFusion('', 'solo-destino')).toBe('solo-destino');
  });
});

describe('subtituloReset', () => {
  it('incluye rama, destino corto y modo entre paréntesis', () => {
    expect(subtituloReset('hard', 'abc1234', 'main')).toBe(
      `main ${FLECHA_DIRECCION} abc1234 (hard)`,
    );
  });

  it('tolera modos no destructivos', () => {
    expect(subtituloReset('soft', 'abc1234', 'main')).toBe(
      `main ${FLECHA_DIRECCION} abc1234 (soft)`,
    );
    expect(subtituloReset('mixed', 'abc1234', 'main')).toBe(
      `main ${FLECHA_DIRECCION} abc1234 (mixed)`,
    );
  });

  it('usa fallbacks cuando faltan datos', () => {
    expect(subtituloReset('hard', '', '')).toBe(
      `HEAD ${FLECHA_DIRECCION} HEAD~? (hard)`,
    );
  });
});

describe('subtituloCherryPick y subtituloRevert', () => {
  it('describe la aplicación de un commit sobre la rama actual', () => {
    expect(subtituloCherryPick('abc1234', 'main')).toBe('aplicar abc1234 sobre main');
  });

  it('describe el revert sobre la rama actual', () => {
    expect(subtituloRevert('abc1234', 'main')).toBe('revertir abc1234 en main');
  });

  it('usa fallbacks cuando falta el hash o la rama', () => {
    expect(subtituloCherryPick('', '')).toBe('aplicar commit sobre HEAD');
    expect(subtituloRevert('', '')).toBe('revertir commit en HEAD');
  });
});

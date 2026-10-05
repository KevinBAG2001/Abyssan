import { describe, expect, it } from 'vitest';
import {
  UMBRAL_COLAPSAR_CAMBIOS,
  debeIniciarColapsado,
  etiquetaDesplegarCambios,
} from '../colapsarCambios';

describe('debeIniciarColapsado', () => {
  it('se mantiene desplegado hasta el umbral', () => {
    for (let i = 0; i <= UMBRAL_COLAPSAR_CAMBIOS; i++) {
      expect(debeIniciarColapsado(i)).toBe(false);
    }
  });

  it('colapsa a partir de superar el umbral', () => {
    expect(debeIniciarColapsado(UMBRAL_COLAPSAR_CAMBIOS + 1)).toBe(true);
    expect(debeIniciarColapsado(50)).toBe(true);
  });

  it('cuenta 0 como no colapsado para no ocultar el mensaje de vacío', () => {
    expect(debeIniciarColapsado(0)).toBe(false);
  });
});

describe('etiquetaDesplegarCambios', () => {
  it('plural y singular correctos para archivos', () => {
    expect(etiquetaDesplegarCambios(1, 0)).toBe('Mostrar 1 archivo');
    expect(etiquetaDesplegarCambios(2, 0)).toBe('Mostrar 2 archivos');
  });

  it('combina commits y archivos con separador explícito', () => {
    expect(etiquetaDesplegarCambios(3, 2)).toBe('Mostrar 3 archivos · 2 commits');
    expect(etiquetaDesplegarCambios(1, 1)).toBe('Mostrar 1 archivo · 1 commit');
  });

  it('solo commits', () => {
    expect(etiquetaDesplegarCambios(0, 1)).toBe('Mostrar 1 commit');
    expect(etiquetaDesplegarCambios(0, 4)).toBe('Mostrar 4 commits');
  });

  it('fallback cuando no hay nada que mostrar', () => {
    expect(etiquetaDesplegarCambios(0, 0)).toBe('Mostrar cambios');
  });
});

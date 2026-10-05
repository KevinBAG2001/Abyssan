import { describe, expect, it } from 'vitest';
import {
  ORDEN_SECCIONES_PREVIEW,
  posicionSeccion,
  type SeccionPreview,
} from '../ordenSeccionesPreview';

describe('ORDEN_SECCIONES_PREVIEW', () => {
  it('comienza por Explicación para contextualizar la operación', () => {
    expect(ORDEN_SECCIONES_PREVIEW[0]).toBe('explicacion');
  });

  it('coloca Riesgos antes de Cambios para que no queden fuera de scroll', () => {
    expect(posicionSeccion('riesgos')).toBeLessThan(posicionSeccion('cambios'));
  });

  it('cubre exactamente las tres secciones esperadas', () => {
    const esperadas: SeccionPreview[] = ['explicacion', 'riesgos', 'cambios'];
    expect([...ORDEN_SECCIONES_PREVIEW].sort()).toEqual([...esperadas].sort());
    expect(ORDEN_SECCIONES_PREVIEW).toHaveLength(3);
  });

  it('posicionSeccion devuelve el índice correcto', () => {
    expect(posicionSeccion('explicacion')).toBe(0);
    expect(posicionSeccion('riesgos')).toBe(1);
    expect(posicionSeccion('cambios')).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { cortoHash, etiquetaEstadoPreview } from '../etiquetaEstadoPreview';

describe('etiquetaEstadoPreview', () => {
  it('acorta el hash y muestra rama', () => {
    expect(cortoHash('abcdef1234567890')).toBe('abcdef1');
    expect(
      etiquetaEstadoPreview({
        rama: 'main',
        head: 'abcdef1234567890',
        base: '1111111222222222',
      })
    ).toBe('main @ abcdef1 · base 1111111');
  });

  it('usa HEAD si no hay rama', () => {
    expect(etiquetaEstadoPreview({ head: 'abc1234' })).toBe('HEAD @ abc1234');
  });
});

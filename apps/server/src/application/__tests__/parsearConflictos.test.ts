import { describe, it, expect } from 'vitest';
import { aplicarEstrategiaHunks, parsearHunksConflicto } from '../conflictos/parsearConflictos.js';

const DOS_HUNKS = `alpha
<<<<<<< HEAD
local-a
=======
remote-a
>>>>>>> other
mid
<<<<<<< HEAD
local-b
=======
remote-b
>>>>>>> other
omega
`;

describe('parsearHunksConflicto', () => {
  it('detecta varios bloques <<<<<<<', () => {
    const hunks = parsearHunksConflicto(DOS_HUNKS);
    expect(hunks).toHaveLength(2);
    expect(hunks[0].actual).toContain('local-a');
    expect(hunks[0].entrante).toContain('remote-a');
    expect(hunks[1].actual).toContain('local-b');
    expect(hunks[1].entrante).toContain('remote-b');
  });

  it('aceptar actual deja ambos lados locales', () => {
    const resuelto = aplicarEstrategiaHunks(DOS_HUNKS, 'actual');
    expect(resuelto).toContain('local-a');
    expect(resuelto).toContain('local-b');
    expect(resuelto).not.toContain('<<<<<<<');
    expect(resuelto).not.toContain('remote-a');
  });

  it('aceptar ambos concatena actual y entrante', () => {
    const resuelto = aplicarEstrategiaHunks(DOS_HUNKS, 'ambos');
    expect(resuelto).toContain('local-a');
    expect(resuelto).toContain('remote-a');
    expect(resuelto).not.toContain('<<<<<<<');
  });
});

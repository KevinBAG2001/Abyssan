import { describe, expect, it } from 'vitest';
import { construirDiffArchivoNuevo } from '../diffArchivoNuevo.js';

describe('construirDiffArchivoNuevo', () => {
  it('incluye el contenido como líneas añadidas', () => {
    const diff = construirDiffArchivoNuevo('src/nuevo.ts', 'export const x = 1;\n');
    expect(diff).toContain('diff --git a/src/nuevo.ts b/src/nuevo.ts');
    expect(diff).toContain('--- /dev/null');
    expect(diff).toContain('+export const x = 1;');
    expect(diff).toContain('@@ -0,0 +1,1 @@');
  });

  it('normaliza barras de Windows', () => {
    const diff = construirDiffArchivoNuevo('apps\\web\\a.ts', 'a\n');
    expect(diff).toContain('a/apps/web/a.ts');
  });

  it('marca binarios sin volcar bytes', () => {
    const diff = construirDiffArchivoNuevo('foto.bin', '', { binario: true });
    expect(diff).toContain('Binary files');
    expect(diff).not.toContain('foto.bin\0');
  });
});

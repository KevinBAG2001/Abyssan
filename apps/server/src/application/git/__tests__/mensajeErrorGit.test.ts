import { describe, expect, it } from 'vitest';
import { limpiarRuidoGit, mensajeErrorGit } from '../mensajeErrorGit.js';

describe('limpiarRuidoGit', () => {
  it('quita el aviso safe.directory con ruta Windows y deja el error real', () => {
    const crudo =
      "warning: safe.directory 'C:/xampp/htdocs/corresrh/lector-pdf' not absolute\n" +
      'error: Your local changes to the following files would be overwritten by checkout:\n' +
      '\tapps/web/src/components/ModalIdentidadGit.tsx';

    expect(limpiarRuidoGit(crudo)).toBe(
      'error: Your local changes to the following files would be overwritten by checkout:\n' +
        '\tapps/web/src/components/ModalIdentidadGit.tsx'
    );
  });
});

describe('mensajeErrorGit', () => {
  it('explica checkout bloqueado por cambios locales y no muestra la C:/ de safe.directory', () => {
    const err = new Error(
      "warning: safe.directory 'C:/xampp/htdocs/corresrh/lector-pdf' not absolute error: Your local changes to the following files would be overwritten by checkout:"
    );
    const mensaje = mensajeErrorGit(err);
    expect(mensaje).toContain('Hay cambios locales sin commitear');
    expect(mensaje).not.toMatch(/C:\//);
    expect(mensaje).not.toMatch(/safe\.directory/);
  });

  it('explica fallo de escritura en .git/objects', () => {
    const err = new Error(
      "error: insufficient permission for adding an object to repository database .git/objects\nerror: SECURITY.md: failed to insert into database"
    );
    expect(mensajeErrorGit(err)).toMatch(/\.git\/objects/);
  });
});

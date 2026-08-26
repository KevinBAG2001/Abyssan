import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
  validarRutaRepositorio,
  validarRutaArchivoEnRepositorio,
  obtenerRaizProyectos,
  esRutaArchivoAbsoluta,
  validarDestinoNuevo,
  validarUrlClone,
  canonizarRuta,
} from '../validarRutaRepositorio.js';

describe('validarRutaRepositorio', () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  const raiz = path.join(os.tmpdir(), 'abyssan-proyectos-test');

  beforeEach(() => {
    process.env.PROJECTS_ROOT = raiz;
    fs.mkdirSync(raiz, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
    if (raizOriginal) {
      process.env.PROJECTS_ROOT = raizOriginal;
    } else {
      delete process.env.PROJECTS_ROOT;
    }
  });

  it('debe permitir rutas dentro de PROJECTS_ROOT', () => {
    const repo = validarRutaRepositorio(path.join(raiz, 'abyssan'));
    expect(repo).toBe(canonizarRuta(path.join(raiz, 'abyssan')));
  });

  it('debe rechazar path traversal fuera de PROJECTS_ROOT', () => {
    const fuera = path.resolve(raiz, '..', 'fuera-de-raiz');
    expect(() => validarRutaRepositorio(fuera)).toThrow('no autorizada');
  });

  it('debe rechazar rutas con .. que salen de la raíz', () => {
    expect(() => validarRutaRepositorio(path.join(raiz, '..', 'otro'))).toThrow('no autorizada');
  });

  it('rechaza un symlink cuyo destino sale de PROJECTS_ROOT', () => {
    const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-escape-'));
    const trampa = path.join(raiz, 'trampa-symlink');
    try {
      const tipo = process.platform === 'win32' ? 'junction' : 'dir';
      fs.symlinkSync(fuera, trampa, tipo);
      expect(() => validarRutaRepositorio(trampa)).toThrow('no autorizada');
    } catch (error) {
      const codigo = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (codigo === 'EPERM' || codigo === 'ENOTSUP') {
        return;
      }
      throw error;
    } finally {
      fs.rmSync(fuera, { recursive: true, force: true });
    }
  });

  it('obtenerRaizProyectos debe fallar sin variable de entorno', () => {
    delete process.env.PROJECTS_ROOT;
    expect(() => obtenerRaizProyectos()).toThrow('PROJECTS_ROOT');
  });

  it('esRutaArchivoAbsoluta detecta POSIX y Windows', () => {
    expect(esRutaArchivoAbsoluta('/etc/passwd')).toBe(true);
    expect(esRutaArchivoAbsoluta('C:\\secret.txt')).toBe(true);
    expect(esRutaArchivoAbsoluta('C:/secret.txt')).toBe(true);
    expect(esRutaArchivoAbsoluta('src/index.ts')).toBe(false);
  });

  it('validarRutaArchivoEnRepositorio debe rechazar rutas absolutas POSIX', () => {
    const repo = path.join(raiz, 'mi-repo');
    expect(() => validarRutaArchivoEnRepositorio(repo, path.resolve(os.tmpdir(), 'secret.txt'))).toThrow(
      'relativa'
    );
  });

  it('validarRutaArchivoEnRepositorio debe rechazar rutas absolutas Windows', () => {
    const repo = path.join(raiz, 'mi-repo');
    expect(() => validarRutaArchivoEnRepositorio(repo, 'C:\\secret.txt')).toThrow('relativa');
  });

  it('validarRutaArchivoEnRepositorio debe rechazar .. en la ruta', () => {
    const repo = path.join(raiz, 'mi-repo');
    expect(() => validarRutaArchivoEnRepositorio(repo, path.join('..', '..', 'secret.txt'))).toThrow();
  });

  it('validarDestinoNuevo rechaza clone fuera de la raíz', () => {
    expect(() => validarDestinoNuevo('../fuera')).toThrow('no autorizada');
    expect(() => validarDestinoNuevo('..\\fuera')).toThrow();
  });

  it('validarDestinoNuevo acepta una subcarpeta', () => {
    const dest = validarDestinoNuevo('nuevo-repo');
    expect(dest).toBe(canonizarRuta(path.join(raiz, 'nuevo-repo')));
  });

  it('validarUrlClone rechaza file:// y rutas locales', () => {
    expect(() => validarUrlClone('file:///tmp/repo')).toThrow();
    expect(() => validarUrlClone('C:\\secret')).toThrow();
    expect(validarUrlClone('https://github.com/org/repo.git')).toContain('https://');
  });
});

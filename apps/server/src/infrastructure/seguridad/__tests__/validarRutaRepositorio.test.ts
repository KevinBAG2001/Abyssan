import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import {
  validarRutaRepositorio,
  validarRutaArchivoEnRepositorio,
  obtenerRaizProyectos,
} from '../validarRutaRepositorio.js';

describe('validarRutaRepositorio', () => {
  const raizOriginal = process.env.PROJECTS_ROOT;

  beforeEach(() => {
    process.env.PROJECTS_ROOT = path.resolve('C:\\proyectos-test');
  });

  afterEach(() => {
    if (raizOriginal) {
      process.env.PROJECTS_ROOT = raizOriginal;
    } else {
      delete process.env.PROJECTS_ROOT;
    }
  });

  it('debe permitir rutas dentro de PROJECTS_ROOT', () => {
    const repo = validarRutaRepositorio(path.join('C:\\proyectos-test', 'webkraken'));
    expect(repo).toBe(path.resolve('C:\\proyectos-test', 'webkraken'));
  });

  it('debe rechazar path traversal fuera de PROJECTS_ROOT', () => {
    expect(() => validarRutaRepositorio('C:\\Windows\\System32')).toThrow('no autorizada');
  });

  it('debe rechazar rutas con .. que salen de la raíz', () => {
    expect(() => validarRutaRepositorio(path.join('C:\\proyectos-test', '..', 'otro'))).toThrow('no autorizada');
  });

  it('obtenerRaizProyectos debe fallar sin variable de entorno', () => {
    delete process.env.PROJECTS_ROOT;
    expect(() => obtenerRaizProyectos()).toThrow('PROJECTS_ROOT');
  });

  it('validarRutaArchivoEnRepositorio debe rechazar rutas absolutas', () => {
    const repo = path.join('C:\\proyectos-test', 'mi-repo');
    expect(() => validarRutaArchivoEnRepositorio(repo, 'C:\\secret.txt')).toThrow('relativa');
  });

  it('validarRutaArchivoEnRepositorio debe rechazar .. en la ruta', () => {
    const repo = path.join('C:\\proyectos-test', 'mi-repo');
    expect(() => validarRutaArchivoEnRepositorio(repo, '..\\..\\secret.txt')).toThrow();
  });
});

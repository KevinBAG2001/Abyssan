import { describe, it, expect } from 'vitest';
import { codigoHttpDeError, cuerpoExito, cuerpoFallo } from '../respuestaApi.js';
import { ErrorForja, MENSAJE_FORJA_CAIDA } from '../../../application/forjas/ErrorForja.js';

describe('contrato API { exito, mensaje, datos, meta }', () => {
  it('cuerpoExito arma el envelope correcto', () => {
    const cuerpo = cuerpoExito({ hash: 'abc' }, 'Commit creado');
    expect(cuerpo).toEqual({
      exito: true,
      mensaje: 'Commit creado',
      datos: { hash: 'abc' },
      meta: {},
    });
  });

  it('cuerpoFallo arma el envelope de error', () => {
    const cuerpo = cuerpoFallo('Parámetro path es requerido');
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.mensaje).toBe('Parámetro path es requerido');
    expect(cuerpo.datos).toEqual({});
    expect(cuerpo.meta).toEqual({});
  });

  it('un path fuera de la raíz se mapea a 403', () => {
    expect(codigoHttpDeError(new Error('Ruta de repositorio no autorizada'))).toBe(403);
  });

  it('un origen CORS rechazado se mapea a 403', () => {
    expect(codigoHttpDeError(new Error('Origen no permitido'))).toBe(403);
  });

  it('falta de confirmación destructiva se mapea a 400', () => {
    expect(codigoHttpDeError(new Error('Confirmación requerida para esta operación destructiva'))).toBe(400);
  });

  it('un error genérico se mapea a 500', () => {
    expect(codigoHttpDeError(new Error('fatal: not a git repository'))).toBe(500);
  });

  it('ErrorForja conserva su código HTTP y no se confunde con un fallo git', () => {
    expect(codigoHttpDeError(new ErrorForja(MENSAJE_FORJA_CAIDA, 503))).toBe(503);
    expect(codigoHttpDeError(new ErrorForja('Token inválido', 401))).toBe(401);
    expect(codigoHttpDeError(new Error('fatal: not a git repository'))).toBe(500);
  });
});

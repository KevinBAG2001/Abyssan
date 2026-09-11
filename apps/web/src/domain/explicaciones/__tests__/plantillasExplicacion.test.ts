import { describe, it, expect } from 'vitest';
import {
  obtenerPlantilla,
  tiposConPlantilla,
  CLAVE_MODO_APRENDIZAJE,
} from '../plantillasExplicacion';
import type { TipoOperacionJournal } from '../../models/GitModels';

const TODOS_LOS_TIPOS: TipoOperacionJournal[] = [
  'checkout',
  'commit',
  'amend',
  'merge',
  'reset',
  'discard',
  'crearRama',
  'borrarRama',
  'renombrarRama',
  'pull',
  'push',
  'clone',
  'init',
  'cherry-pick',
  'revert',
];

describe('plantillasExplicacion', () => {
  it('tiene plantilla para cada tipo de operación del journal', () => {
    const definidos = tiposConPlantilla();
    for (const tipo of TODOS_LOS_TIPOS) {
      expect(definidos, `Falta plantilla para: ${tipo}`).toContain(tipo);
    }
  });

  it('cada plantilla tiene titulo, explicacion y detalle no vacíos', () => {
    for (const tipo of TODOS_LOS_TIPOS) {
      const p = obtenerPlantilla(tipo);
      expect(p.titulo, `titulo vacío en ${tipo}`).toBeTruthy();
      expect(p.explicacion, `explicacion vacía en ${tipo}`).toBeTruthy();
      expect(p.detalle, `detalle vacío en ${tipo}`).toBeTruthy();
      expect(p.titulo.length, `titulo muy corto en ${tipo}`).toBeGreaterThan(3);
      expect(p.explicacion.length, `explicacion muy corta en ${tipo}`).toBeGreaterThan(20);
    }
  });

  it('devuelve fallback para un tipo desconocido sin lanzar error', () => {
    const p = obtenerPlantilla('tipo_inventado' as TipoOperacionJournal);
    expect(p.titulo).toContain('tipo_inventado');
    expect(p.explicacion).toBeTruthy();
    expect(p.detalle).toBeTruthy();
  });

  it('tiposConPlantilla devuelve al menos 15 tipos', () => {
    expect(tiposConPlantilla().length).toBeGreaterThanOrEqual(15);
  });

  it('la clave de localStorage tiene el prefijo abyssan', () => {
    expect(CLAVE_MODO_APRENDIZAJE).toBe('abyssan.modoAprendizaje');
  });

  it('las explicaciones de checkout mencionan HEAD', () => {
    const p = obtenerPlantilla('checkout');
    expect(p.explicacion).toContain('HEAD');
  });

  it('las explicaciones de reset mencionan los tres modos', () => {
    const p = obtenerPlantilla('reset');
    expect(p.detalle).toContain('Soft');
    expect(p.detalle).toContain('Mixed');
    expect(p.detalle).toContain('Hard');
  });

  it('la explicación de discard menciona snapshot', () => {
    const p = obtenerPlantilla('discard');
    expect(p.detalle).toContain('snapshot');
  });

  it('la explicación de push menciona remoto', () => {
    const p = obtenerPlantilla('push');
    expect(p.explicacion).toContain('remoto');
  });

  it('ninguna plantilla contiene texto en inglés obvio (LLM, AI, API key)', () => {
    for (const tipo of TODOS_LOS_TIPOS) {
      const p = obtenerPlantilla(tipo);
      const todo = `${p.titulo} ${p.explicacion} ${p.detalle}`;
      expect(todo, `${tipo} menciona LLM`).not.toMatch(/\bLLM\b/i);
      expect(todo, `${tipo} menciona AI/artificial intelligence`).not.toMatch(/\bartificial intelligence\b/i);
      expect(todo, `${tipo} menciona API key`).not.toMatch(/\bAPI key\b/i);
    }
  });
});

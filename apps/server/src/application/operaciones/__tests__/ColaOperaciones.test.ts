import { describe, it, expect } from 'vitest';
import { ColaOperaciones } from '../ColaOperaciones.js';

describe('ColaOperaciones', () => {
  it('no corre dos mutaciones del mismo repo a la vez', async () => {
    const cola = new ColaOperaciones();
    const orden: string[] = [];
    let primeraDentro = false;

    const a = cola.encolar('C:/repos/uno', async () => {
      primeraDentro = true;
      orden.push('a-start');
      await new Promise((r) => setTimeout(r, 40));
      orden.push('a-end');
    });

    const b = cola.encolar('C:/repos/uno', async () => {
      expect(primeraDentro).toBe(true);
      expect(orden.includes('a-end')).toBe(true);
      orden.push('b');
    });

    await Promise.all([a, b]);
    expect(orden).toEqual(['a-start', 'a-end', 'b']);
  });

  it('permite mutaciones en paralelo en repos distintos', async () => {
    const cola = new ColaOperaciones();
    let concurrentes = 0;
    let max = 0;

    const trabajo = async () => {
      concurrentes += 1;
      max = Math.max(max, concurrentes);
      await new Promise((r) => setTimeout(r, 30));
      concurrentes -= 1;
    };

    await Promise.all([cola.encolar('/r/a', trabajo), cola.encolar('/r/b', trabajo)]);
    expect(max).toBe(2);
  });
});

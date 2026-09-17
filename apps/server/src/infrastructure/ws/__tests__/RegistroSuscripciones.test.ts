import { describe, it, expect } from 'vitest';
import { RegistroSuscripciones } from '../RegistroSuscripciones.js';

describe('RegistroSuscripciones', () => {
  it('el primer oyente abre el grupo y el último lo cierra', () => {
    const registro = new RegistroSuscripciones<() => void>();
    const a = () => undefined;
    const b = () => undefined;

    expect(registro.agregar('C:/repos/Uno', a)).toBe(true);
    expect(registro.agregar('C:/repos/uno/', b)).toBe(false);
    expect(registro.cantidad('c:/repos/uno')).toBe(2);

    expect(registro.quitar('C:/repos/Uno', a)).toBe(false);
    expect(registro.cantidad('C:/repos/uno')).toBe(1);
    expect(registro.quitar('C:/repos/Uno', b)).toBe(true);
    expect(registro.cantidad('C:/repos/uno')).toBe(0);
  });

  it('quitarDeTodos solo vacía las claves donde estaba el oyente', () => {
    const registro = new RegistroSuscripciones<string>();
    registro.agregar('/r/a', 'uno');
    registro.agregar('/r/a', 'dos');
    registro.agregar('/r/b', 'uno');

    expect(registro.quitarDeTodos('uno')).toEqual(['/r/b']);
    expect(registro.cantidad('/r/a')).toBe(1);
    expect(registro.cantidad('/r/b')).toBe(0);
  });

  it('vaciarTodo deja el registro vacío', () => {
    const registro = new RegistroSuscripciones<number>();
    registro.agregar('/r/a', 1);
    registro.vaciarTodo();
    expect(registro.cantidad('/r/a')).toBe(0);
  });
});

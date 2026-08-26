/**
 * Cola in-process: serializa mutaciones por repositorio.
 * Distintos repos pueden correr en paralelo.
 */
export class ColaOperaciones {
  private colas = new Map<string, Promise<unknown>>();

  private clave(repo: string): string {
    return repo.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  async encolar<T>(repo: string, trabajo: () => Promise<T>): Promise<T> {
    const clave = this.clave(repo);
    const anterior = this.colas.get(clave) ?? Promise.resolve();

    let liberar!: () => void;
    const hold = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    const cadena = anterior.catch(() => undefined).then(() => hold);
    this.colas.set(clave, cadena);

    await anterior.catch(() => undefined);
    try {
      return await trabajo();
    } finally {
      liberar();
      if (this.colas.get(clave) === cadena) {
        this.colas.delete(clave);
      }
    }
  }

  hayTrabajo(repo: string): boolean {
    return this.colas.has(this.clave(repo));
  }
}

export const colaOperaciones = new ColaOperaciones();

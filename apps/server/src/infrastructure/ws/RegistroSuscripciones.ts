/**
 * Multiplexa oyentes por repositorio. El watcher de filesystem se arranca
 * solo con el primer suscriptor y se cierra con el último.
 */
export class RegistroSuscripciones<T> {
  private porClave = new Map<string, Set<T>>();

  private clave(repo: string): string {
    return repo.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  /** true si este oyente es el primero del repo (hay que abrir el watcher). */
  agregar(repo: string, oyente: T): boolean {
    const clave = this.clave(repo);
    let grupo = this.porClave.get(clave);
    if (!grupo) {
      grupo = new Set();
      this.porClave.set(clave, grupo);
    }
    const eraPrimero = grupo.size === 0;
    grupo.add(oyente);
    return eraPrimero;
  }

  /** true si el repo queda sin oyentes (hay que cerrar el watcher). */
  quitar(repo: string, oyente: T): boolean {
    const clave = this.clave(repo);
    const grupo = this.porClave.get(clave);
    if (!grupo) return false;
    grupo.delete(oyente);
    if (grupo.size === 0) {
      this.porClave.delete(clave);
      return true;
    }
    return false;
  }

  /** Claves que quedaron vacías al retirar al oyente de todos los repos. */
  quitarDeTodos(oyente: T): string[] {
    const vacios: string[] = [];
    for (const [clave, grupo] of this.porClave) {
      if (!grupo.has(oyente)) continue;
      grupo.delete(oyente);
      if (grupo.size === 0) {
        this.porClave.delete(clave);
        vacios.push(clave);
      }
    }
    return vacios;
  }

  oyentes(repo: string): ReadonlySet<T> {
    return this.porClave.get(this.clave(repo)) ?? new Set();
  }

  cantidad(repo: string): number {
    return this.oyentes(repo).size;
  }

  vaciar(repo: string): void {
    this.porClave.delete(this.clave(repo));
  }

  vaciarTodo(): void {
    this.porClave.clear();
  }
}

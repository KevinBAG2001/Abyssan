import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { RegistroSuscripciones } from '../ws/RegistroSuscripciones.js';

export type ChangeCallback = (repoPath: string, eventType: string, filePath: string) => void;

type EntradaWatcher = {
  watcher: FSWatcher;
  rutaOriginal: string;
};

export class ChokidarWatcherAdapter {
  private watchers = new Map<string, EntradaWatcher>();
  private suscripciones = new RegistroSuscripciones<ChangeCallback>();

  private clave(repoPath: string): string {
    return repoPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  watchRepo(repoPath: string, onChange: ChangeCallback): void {
    const primero = this.suscripciones.agregar(repoPath, onChange);
    if (!primero) {
      return;
    }

    const watcher = chokidar.watch(repoPath, {
      ignored: [
        /(^|[\/\\])\../,
        '**/node_modules/**',
        '**/.git/objects/**',
        '**/.git/logs/**',
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 4,
    });

    let debounceTimer: NodeJS.Timeout | null = null;

    const notify = (event: string, itemPath: string) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const relativo = path.relative(repoPath, itemPath);
        for (const cb of this.suscripciones.oyentes(repoPath)) {
          cb(repoPath, event, relativo);
        }
      }, 300);
    };

    watcher
      .on('add', (p) => notify('add', p))
      .on('change', (p) => notify('change', p))
      .on('unlink', (p) => notify('unlink', p))
      .on('addDir', (p) => notify('addDir', p))
      .on('unlinkDir', (p) => notify('unlinkDir', p));

    this.watchers.set(this.clave(repoPath), { watcher, rutaOriginal: repoPath });
  }

  unwatchRepo(repoPath: string, onChange?: ChangeCallback): void {
    if (onChange) {
      const ultimo = this.suscripciones.quitar(repoPath, onChange);
      if (ultimo) this.cerrarWatcher(repoPath);
      return;
    }
    this.suscripciones.vaciar(repoPath);
    this.cerrarWatcher(repoPath);
  }

  dejarDeEscuchar(onChange: ChangeCallback): void {
    const vacios = this.suscripciones.quitarDeTodos(onChange);
    for (const clave of vacios) {
      const entrada = this.watchers.get(clave);
      if (entrada) this.cerrarWatcher(entrada.rutaOriginal);
    }
  }

  cantidadOyentes(repoPath: string): number {
    return this.suscripciones.cantidad(repoPath);
  }

  cantidadWatchers(): number {
    return this.watchers.size;
  }

  closeAll(): Promise<void> {
    const pendientes = [...this.watchers.values()].map((entrada) => Promise.resolve(entrada.watcher.close()));
    this.watchers.clear();
    this.suscripciones.vaciarTodo();
    return Promise.all(pendientes).then(() => undefined);
  }

  private cerrarWatcher(repoPath: string): void {
    const clave = this.clave(repoPath);
    const entrada = this.watchers.get(clave);
    if (!entrada) return;
    entrada.watcher.close();
    this.watchers.delete(clave);
  }
}

export const watcherAdapter = new ChokidarWatcherAdapter();

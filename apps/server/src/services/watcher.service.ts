import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';

export type ChangeCallback = (repoPath: string, eventType: string, filePath: string) => void;

export class WatcherService {
  private watchers: Map<string, FSWatcher> = new Map();

  watchRepo(repoPath: string, onChange: ChangeCallback): void {
    if (this.watchers.has(repoPath)) {
      return;
    }

    // Monitoreamos el working tree y el directorio .git (excepto logs muy frecuentes)
    const watcher = chokidar.watch(repoPath, {
      ignored: [
        /(^|[\/\\])\../, // archivos ocultos excepto .git
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
        onChange(repoPath, event, path.relative(repoPath, itemPath));
      }, 300); // 300ms debounce para evitar inundar de eventos
    };

    watcher
      .on('add', (p) => notify('add', p))
      .on('change', (p) => notify('change', p))
      .on('unlink', (p) => notify('unlink', p))
      .on('addDir', (p) => notify('addDir', p))
      .on('unlinkDir', (p) => notify('unlinkDir', p));

    this.watchers.set(repoPath, watcher);
  }

  unwatchRepo(repoPath: string): void {
    const watcher = this.watchers.get(repoPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(repoPath);
    }
  }

  closeAll(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

export const watcherService = new WatcherService();

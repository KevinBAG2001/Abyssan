// Austria: Adaptador de infraestructura para monitoreo del sistema de archivos con Chokidar
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';

export type ChangeCallback = (repoPath: string, eventType: string, filePath: string) => void;

export class ChokidarWatcherAdapter {
  private watchers: Map<string, FSWatcher> = new Map();

  watchRepo(repoPath: string, onChange: ChangeCallback): void {
    if (this.watchers.has(repoPath)) {
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
        onChange(repoPath, event, path.relative(repoPath, itemPath));
      }, 300);
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
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

export const watcherAdapter = new ChokidarWatcherAdapter();

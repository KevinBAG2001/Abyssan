import { afterAll, afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ChokidarWatcherAdapter, type ChangeCallback } from '../ChokidarWatcherAdapter.js';

describe('ChokidarWatcherAdapter', () => {
  const adapter = new ChokidarWatcherAdapter();
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-watch-'));

  afterEach(async () => {
    await adapter.closeAll();
  });

  afterAll(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
  });

  it('multiplexa oyentes: un watcher de filesystem, N callbacks', () => {
    const repo = path.join(raiz, 'uno');
    fs.mkdirSync(repo, { recursive: true });
    const a: ChangeCallback = () => undefined;
    const b: ChangeCallback = () => undefined;

    adapter.watchRepo(repo, a);
    adapter.watchRepo(repo, b);

    expect(adapter.cantidadOyentes(repo)).toBe(2);
    expect(adapter.cantidadWatchers()).toBe(1);

    adapter.unwatchRepo(repo, a);
    expect(adapter.cantidadOyentes(repo)).toBe(1);
    expect(adapter.cantidadWatchers()).toBe(1);

    adapter.unwatchRepo(repo, b);
    expect(adapter.cantidadOyentes(repo)).toBe(0);
    expect(adapter.cantidadWatchers()).toBe(0);
  });

  it('dejarDeEscuchar cierra el watcher si era el último cliente', () => {
    const repo = path.join(raiz, 'dos');
    fs.mkdirSync(repo, { recursive: true });
    const cb: ChangeCallback = () => undefined;
    adapter.watchRepo(repo, cb);
    expect(adapter.cantidadWatchers()).toBe(1);
    adapter.dejarDeEscuchar(cb);
    expect(adapter.cantidadOyentes(repo)).toBe(0);
    expect(adapter.cantidadWatchers()).toBe(0);
  });

  it('repos distintos tienen watchers distintos; el último de cada uno limpia', () => {
    const a = path.join(raiz, 'alpha');
    const b = path.join(raiz, 'beta');
    fs.mkdirSync(a, { recursive: true });
    fs.mkdirSync(b, { recursive: true });
    const ca: ChangeCallback = () => undefined;
    const cb: ChangeCallback = () => undefined;
    adapter.watchRepo(a, ca);
    adapter.watchRepo(b, cb);
    expect(adapter.cantidadWatchers()).toBe(2);
    adapter.dejarDeEscuchar(ca);
    expect(adapter.cantidadWatchers()).toBe(1);
    expect(adapter.cantidadOyentes(b)).toBe(1);
    adapter.dejarDeEscuchar(cb);
    expect(adapter.cantidadWatchers()).toBe(0);
  });

  it('closeAll vacía oyentes y watchers', async () => {
    const repo = path.join(raiz, 'tres');
    fs.mkdirSync(repo, { recursive: true });
    adapter.watchRepo(repo, () => undefined);
    await adapter.closeAll();
    expect(adapter.cantidadOyentes(repo)).toBe(0);
    expect(adapter.cantidadWatchers()).toBe(0);
  });
});

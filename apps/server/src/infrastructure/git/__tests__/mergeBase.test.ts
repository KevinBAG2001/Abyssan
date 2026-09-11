import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../logging/InMemoryCommandLogAdapter.js';

describe('mergeBase', { timeout: 20_000 }, () => {
  let raiz: string;
  let adapter: SimpleGitAdapter;
  const raizOriginal = process.env.PROJECTS_ROOT;

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-mb-'));
    process.env.PROJECTS_ROOT = raiz;
    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());

    // Crear repo con dos ramas divergentes
    const repo = path.join(raiz, 'repo');
    fs.mkdirSync(repo, { recursive: true });
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig('user.email', 'test@abyssan.dev');
    await git.addConfig('user.name', 'Test');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'base\n');
    await git.add('.');
    await git.commit('inicial');
    // Crear rama feature
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'b.txt'), 'feature\n');
    await git.add('.');
    await git.commit('commit en feature');
    // Volver a main y commitear
    await git.checkout('master');
    fs.writeFileSync(path.join(repo, 'c.txt'), 'main\n');
    await git.add('.');
    await git.commit('commit en main');
  });

  afterEach(() => {
    if (raizOriginal) process.env.PROJECTS_ROOT = raizOriginal;
    else delete process.env.PROJECTS_ROOT;
    try { fs.rmSync(raiz, { recursive: true, force: true }); } catch { /* Windows lock */ }
  });

  it('encuentra el merge-base entre master y feature', async () => {
    const repo = path.join(raiz, 'repo');
    const hash = await adapter.mergeBase(repo, 'master', 'feature');
    expect(hash).toBeTruthy();
    expect(hash!.length).toBeGreaterThanOrEqual(7);
    // El merge-base debe ser el commit inicial
    const git = simpleGit(repo);
    const log = await git.log({ maxCount: 10 });
    const inicial = log.all.find((c) => c.message === 'inicial');
    expect(hash).toBe(inicial?.hash);
  });

  it('devuelve null si no hay ancestro común', async () => {
    // Crear repo sin conexión
    const repo2 = path.join(raiz, 'repo2');
    fs.mkdirSync(repo2);
    const git2 = simpleGit(repo2);
    await git2.init();
    await git2.addConfig('user.email', 'test@abyssan.dev');
    await git2.addConfig('user.name', 'Test');
    fs.writeFileSync(path.join(repo2, 'x.txt'), 'x\n');
    await git2.add('.');
    await git2.commit('unico');
    // Refs inválidas
    const hash = await adapter.mergeBase(repo2, 'master', 'rama_inexistente');
    expect(hash).toBeNull();
  });
});

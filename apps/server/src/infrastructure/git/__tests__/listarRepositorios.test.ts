import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../logging/InMemoryCommandLogAdapter.js';

describe('listRepositories (escaneo ligero)', () => {
  let raiz: string;
  let adapter: SimpleGitAdapter;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-scan-'));
    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
  });

  afterEach(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
  });

  it('encuentra un repo en el primer nivel y no entra a node_modules', async () => {
    const repo = path.join(raiz, 'Abyssan');
    fs.mkdirSync(repo);
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig('user.email', 'test@abyssan.dev');
    await git.addConfig('user.name', 'Test');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'x\n');
    await git.add('.');
    await git.commit('init');

    const falso = path.join(repo, 'node_modules', 'otra');
    fs.mkdirSync(falso, { recursive: true });
    fs.mkdirSync(path.join(falso, '.git'));

    const lista = await adapter.listRepositories(raiz);
    expect(lista.map((r) => r.name)).toEqual(['Abyssan']);
    expect(lista[0].isGitRepo).toBe(true);
    expect(lista[0].path).toBe(repo);
  });

  it('un directorio sin .git no aparece', async () => {
    fs.mkdirSync(path.join(raiz, 'notas'));
    const lista = await adapter.listRepositories(raiz);
    expect(lista).toEqual([]);
  });
});

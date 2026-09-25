import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';

async function crearRepo(raiz: string, nombre: string) {
  const repo = path.join(raiz, nombre);
  fs.mkdirSync(repo, { recursive: true });
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@abyssan.dev');
  await git.addConfig('user.name', 'Test Abyssan');
  fs.writeFileSync(path.join(repo, 'archivo.txt'), 'hola\n');
  await git.add('.');
  await git.commit('inicial');
  return { repo, git };
}

describe('Perímetro de refs Git (SEC-REF-01)', { timeout: 20_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let casos: GitUseCases;

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-refs-'));
    const dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-journal-'));
    process.env.PROJECTS_ROOT = raiz;
    const journal = new JournalOperaciones(dirJournal);
    casos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      journal
    );
  });

  afterEach(() => {
    if (raizOriginal) process.env.PROJECTS_ROOT = raizOriginal;
    else delete process.env.PROJECTS_ROOT;
    try {
      fs.rmSync(raiz, { recursive: true, force: true });
    } catch {
      // Windows puede retener el lock de git un instante
    }
  });

  it('checkout de una rama real funciona', async () => {
    const { repo, git } = await crearRepo(raiz, 'checkout-ok');
    await git.checkoutLocalBranch('feature-ok');
    const base = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    expect(base).toBe('feature-ok');
    const ramas = await git.branchLocal();
    const otra = Object.keys(ramas.branches).find((n) => n !== 'feature-ok');
    expect(otra).toBeTruthy();
    await casos.checkout(repo, otra!);
    const actual = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    expect(actual).toBe(otra);
  });

  it('checkout con flag no cambia HEAD', async () => {
    const { repo, git } = await crearRepo(raiz, 'checkout-flag');
    const antes = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    await expect(casos.checkout(repo, '-uorigin')).rejects.toThrow('Ref Git');
    const despues = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    expect(despues).toBe(antes);
  });

  it('createBranch rechaza nombres que parecen opciones', async () => {
    const { repo, git } = await crearRepo(raiz, 'branch-flag');
    await expect(casos.createBranch(repo, '--output')).rejects.toThrow('Ref Git');
    const ramas = await git.branchLocal();
    expect(Object.keys(ramas.branches).some((n) => n.includes('output'))).toBe(false);
  });

  it('merge rechaza origen malicioso y no deja MERGE_HEAD', async () => {
    const { repo } = await crearRepo(raiz, 'merge-flag');
    await expect(casos.merge(repo, 'otra;id')).rejects.toThrow('Ref Git');
    expect(fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD'))).toBe(false);
  });

  it('cherry-pick y revert rechazan hashes que no son hex', async () => {
    const { repo, git } = await crearRepo(raiz, 'pick-flag');
    const head = (await git.revparse(['HEAD'])).trim();
    await expect(casos.cherryPick(repo, '--output=/tmp/x')).rejects.toThrow('Hash');
    await expect(casos.revert(repo, 'HEAD~1')).rejects.toThrow('Hash');
    expect((await git.revparse(['HEAD'])).trim()).toBe(head);
  });

  it('reset rechaza destino con metacaracteres', async () => {
    const { repo, git } = await crearRepo(raiz, 'reset-flag');
    const head = (await git.revparse(['HEAD'])).trim();
    await expect(casos.reset(repo, 'mixed', 'HEAD~1')).rejects.toThrow('Ref Git');
    await expect(casos.reset(repo, 'hard', '-f')).rejects.toThrow();
    expect((await git.revparse(['HEAD'])).trim()).toBe(head);
  });

  it('createTag rechaza nombres flag y acepta v1.0.0', async () => {
    const { repo, git } = await crearRepo(raiz, 'tag-flag');
    await expect(casos.createTag(repo, '-a')).rejects.toThrow('Ref Git');
    await casos.createTag(repo, 'v1.0.0');
    const tags = await git.tags();
    expect(tags.all).toContain('v1.0.0');
  });

  it('popStash rechaza un índice que no es entero ≥ 0', async () => {
    const { repo } = await crearRepo(raiz, 'stash-idx');
    await expect(casos.popStash(repo, -1)).rejects.toThrow('Índice de stash');
    await expect(casos.dropStash(repo, Number.NaN)).rejects.toThrow('Índice de stash');
  });

  it('fetchAll rechaza un remoto file:// ya persistido en .git/config', async () => {
    const { repo, git } = await crearRepo(raiz, 'fetch-file');
    const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-fuera-fetch-'));
    try {
      const url = `file://${fuera.replace(/\\/g, '/')}`;
      await git.addRemote('escape', url);
      await expect(casos.fetchAll(repo)).rejects.toThrow('file://');
      await expect(casos.programarFetch(repo)).rejects.toThrow('file://');
    } finally {
      fs.rmSync(fuera, { recursive: true, force: true });
    }
  });
});

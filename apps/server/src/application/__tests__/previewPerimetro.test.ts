import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';
import { codigoHttpDeError } from '../../interfaces/http/respuestaApi.js';

async function crearRepo(raiz: string, nombre: string) {
  const repo = path.join(raiz, nombre);
  fs.mkdirSync(repo, { recursive: true });
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@abyssan.dev');
  await git.addConfig('user.name', 'Test Abyssan');
  fs.writeFileSync(path.join(repo, 'archivo.txt'), 'base\n');
  await git.add('.');
  await git.commit('inicial');
  return { repo, git };
}

async function huellaRepo(git: SimpleGit) {
  const head = (await git.revparse(['HEAD'])).trim();
  const status = await git.raw(['status', '--porcelain=v1']);
  const refs = await git.raw(['for-each-ref', '--format=%(refname) %(objectname)']);
  const objetos = (await git.raw(['count-objects'])).trim();
  return { head, status, refs, objetos };
}

describe('Preview no mutante (PREV-01)', { timeout: 30_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let adapter: SimpleGitAdapter;
  let casos: GitUseCases;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-preview-'));
    const dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-journal-'));
    process.env.PROJECTS_ROOT = raiz;
    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
    casos = new GitUseCases(adapter, new InMemoryCommandLogAdapter(), new JournalOperaciones(dirJournal));
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

  it('rechaza rebase y force-push: el contrato no finge soporte', async () => {
    const { repo } = await crearRepo(raiz, 'preview-ops');
    await expect(
      casos.previewOperacion(repo, 'rebase' as never, {})
    ).rejects.toThrow('Operación de preview no soportada');
    await expect(
      casos.previewOperacion(repo, 'force-push' as never, {})
    ).rejects.toThrow('Operación de preview no soportada');
    expect(codigoHttpDeError(new Error('Operación de preview no soportada: rebase'))).toBe(400);
  });

  it('preview de merge no muta HEAD, refs, worktree ni objetos sueltos', async () => {
    const { repo, git } = await crearRepo(raiz, 'preview-merge');
    const base = (await git.status()).current || 'master';
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'nuevo.txt'), 'feature\n');
    await git.add('.');
    await git.commit('en feature');
    await git.checkout(base);
    fs.writeFileSync(path.join(repo, 'sucio-local.txt'), 'no commiteado\n');
    const huellaAntes = await huellaRepo(git);
    const preview = await casos.previewOperacion(repo, 'merge', { sourceBranch: 'feature' });
    expect(preview.operacion).toBe('merge');
    expect(preview.seguroEjecutar).toBe(true);
    expect(preview.repositorio).toBe(repo);
    expect(preview.estadoActual.head).toBe(huellaAntes.head);
    expect(preview.estadoActual.base).toBeTruthy();
    expect(preview.estadoObjetivo.rama).toBe('feature');
    expect(preview.explicacion.length).toBeGreaterThan(0);
    expect(preview.commitsAfectados.length).toBeGreaterThan(0);
    expect(preview.archivosAfectados.some((a) => a.path.includes('nuevo.txt'))).toBe(true);
    expect(preview.posiblesConflictos).toEqual([]);
    expect(await huellaRepo(git)).toEqual(huellaAntes);
    expect(fs.existsSync(path.join(repo, 'nuevo.txt'))).toBe(false);
    expect(fs.readFileSync(path.join(repo, 'sucio-local.txt'), 'utf8')).toBe('no commiteado\n');
    expect(fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD'))).toBe(false);
  });

  it('detecta conflictos de merge sin iniciar el merge en el repo real', async () => {
    const { repo, git } = await crearRepo(raiz, 'preview-conflicto');
    const ramaBase = (await git.status()).current || 'master';
    await git.checkoutLocalBranch('otra');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'otra\n');
    await git.add('.');
    await git.commit('cambio en otra');
    await git.checkout(ramaBase);
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'main\n');
    await git.add('.');
    await git.commit('cambio en main');
    const huellaAntes = await huellaRepo(git);

    const preview = await casos.previewOperacion(repo, 'merge', { sourceBranch: 'otra' });

    expect(preview.seguroEjecutar).toBe(true);
    expect(preview.posiblesConflictos.some((f) => f.includes('archivo.txt'))).toBe(true);
    expect(preview.advertencias.some((a) => a.includes('conflicto'))).toBe(true);
    expect(fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8')).toBe('main\n');
    expect(fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD'))).toBe(false);
    expect(await huellaRepo(git)).toEqual(huellaAntes);
  });

  it('obtenerHashHead es HEAD real, no el primer commit de git log --all', async () => {
    const { repo, git } = await crearRepo(raiz, 'preview-head');
    const hashMaster = (await git.revparse(['HEAD'])).trim();
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'feat.txt'), 'mas nuevo\n');
    await git.add('.');
    await git.commit('mas reciente en feature');
    await git.checkout(hashMaster);

    const head = await adapter.obtenerHashHead(repo);
    const masReciente = await adapter.getCommits(repo, 1);
    expect(head).toBe(hashMaster);
    expect(masReciente[0]?.hash).not.toBe(head);
  });
});

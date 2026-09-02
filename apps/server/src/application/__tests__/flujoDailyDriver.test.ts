import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';
import { validarDestinoNuevo } from '../../infrastructure/seguridad/validarRutaRepositorio.js';

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

describe('Flujo Daily Driver (mutaciones Git reales)', { timeout: 20_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let casos: GitUseCases;

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-dd-'));
    const dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-journal-'));
    process.env.PROJECTS_ROOT = raiz;
    const journal = new JournalOperaciones(dirJournal);
    casos = new GitUseCases(new SimpleGitAdapter(new InMemoryCommandLogAdapter()), new InMemoryCommandLogAdapter(), journal);
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

  it('status → stage archivo → commit', async () => {
    const { repo } = await crearRepo(raiz, 'flujo');
    fs.writeFileSync(path.join(repo, 'nuevo.ts'), 'export const x = 1;\n');
    const sucio = await casos.getRepositoryStatus(repo);
    expect(sucio.files.some((f) => f.path.replace(/\\/g, '/') === 'nuevo.ts')).toBe(true);

    await casos.stage(repo, 'nuevo.ts');
    const preparado = await casos.getRepositoryStatus(repo);
    expect(preparado.files.some((f) => f.staged && f.path.replace(/\\/g, '/') === 'nuevo.ts')).toBe(true);

    const hash = await casos.commit(repo, 'añade nuevo.ts');
    expect(hash.length).toBeGreaterThan(6);
    const limpio = await casos.getRepositoryStatus(repo);
    expect(limpio.isClean).toBe(true);
  });

  it('discard restaura el working tree', async () => {
    const { repo } = await crearRepo(raiz, 'discard');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'sucio\n');
    await casos.discardArchivo(repo, 'archivo.txt');
    const contenido = fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8');
    expect(contenido.replace(/\r\n/g, '\n')).toBe('hola\n');
    const status = await casos.getRepositoryStatus(repo);
    expect(status.isClean).toBe(true);
  });

  it('merge --abort limpia el conflicto', async () => {
    const { repo, git } = await crearRepo(raiz, 'merge-abort');
    const ramaBase = (await git.status()).current!;
    await git.checkoutLocalBranch('otra');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'otra\n');
    await git.add('.');
    await git.commit('cambio en otra');
    await git.checkout(ramaBase);
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'main\n');
    await git.add('.');
    await git.commit('cambio en main');
    let huboConflicto = false;
    try {
      await git.merge(['otra']);
    } catch {
      huboConflicto = true;
    }
    expect(huboConflicto).toBe(true);
    const enMerge = await casos.getRepositoryStatus(repo);
    expect(enMerge.isMerging).toBe(true);
    await casos.abortarMerge(repo);
    const limpio = await casos.getRepositoryStatus(repo);
    expect(limpio.isMerging).toBeFalsy();
  });

  it('clone rechazado fuera de PROJECTS_ROOT', () => {
    expect(() => validarDestinoNuevo(path.join('..', 'fuera'))).toThrow('no autorizada');
  });

  it('no borra la rama HEAD', async () => {
    const { repo, git } = await crearRepo(raiz, 'head-branch');
    const rama = (await git.status()).current;
    expect(rama).toBeTruthy();
    await expect(casos.deleteLocalBranch(repo, rama!)).rejects.toThrow('HEAD');
  });

  it('deshacer crear rama elimina la rama', async () => {
    const { repo } = await crearRepo(raiz, 'undo-rama');
    await casos.createBranch(repo, 'feature-x');
    const conRama = await casos.getBranches(repo);
    expect(conRama.some((b) => b.name === 'feature-x')).toBe(true);
    await casos.deshacer(repo);
    const sinRama = await casos.getBranches(repo);
    expect(sinRama.some((b) => b.name === 'feature-x')).toBe(false);
  });

  it('commit local no depende de la forja aunque origin apunte a GitHub', async () => {
    const { repo, git } = await crearRepo(raiz, 'sin-forja');
    await git.addRemote('origin', 'https://github.com/abyssan/inexistente.git');
    fs.writeFileSync(path.join(repo, 'local.ts'), 'export const ok = true;\n');
    await casos.stage(repo, 'local.ts');
    const hash = await casos.commit(repo, 'cambio local sin forja');
    expect(hash.length).toBeGreaterThan(6);
    const limpio = await casos.getRepositoryStatus(repo);
    expect(limpio.isClean).toBe(true);
  });
});

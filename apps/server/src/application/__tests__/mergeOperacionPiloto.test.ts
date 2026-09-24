import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';
import { OperationManager } from '../operaciones/OperationManager.js';
import { RepositoryOperationLock } from '../operaciones/RepositoryOperationLock.js';
import { RegistroOperaciones } from '../operaciones/RegistroOperaciones.js';

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
  const ramaBase = (await git.status()).current!;
  return { repo, git, ramaBase };
}

describe('Merge piloto — OperationManager + lock (repos temporales)', { timeout: 20_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let lock: RepositoryOperationLock;
  let gestor: OperationManager;
  let casos: GitUseCases;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-merge-'));
    const dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-journal-'));
    process.env.PROJECTS_ROOT = raiz;
    lock = new RepositoryOperationLock();
    gestor = new OperationManager(lock, new RegistroOperaciones());
    casos = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal),
      gestor
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

  it('merge exitoso produce operationId, estado completed y libera el lock', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'ok');
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'extra.ts'), 'export const n = 1;\n');
    await git.add('.');
    await git.commit('añade extra');
    await git.checkout(ramaBase);

    const operacion = await casos.merge(repo, 'feature');

    expect(operacion.operationId).toMatch(/^[a-f0-9]+$/);
    expect(operacion.type).toBe('merge');
    expect(operacion.state).toBe('completed');
    expect(operacion.startedAt).toBeTruthy();
    expect(operacion.finishedAt).toBeTruthy();
    expect(operacion.duration).toBeGreaterThanOrEqual(0);
    expect(operacion.error).toBeUndefined();
    expect(operacion.metadata.sourceBranch).toBe('feature');
    expect(lock.hayTrabajo(repo)).toBe(false);
    expect(fs.existsSync(path.join(repo, 'extra.ts'))).toBe(true);
  });

  it('merge conflictivo falla, conserva error y libera el lock', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'conflicto');
    await git.checkoutLocalBranch('otra');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'otra\n');
    await git.add('.');
    await git.commit('cambio en otra');
    await git.checkout(ramaBase);
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'main\n');
    await git.add('.');
    await git.commit('cambio en main');

    await expect(casos.merge(repo, 'otra')).rejects.toThrow();

    const fallida = gestor.listar().find((op) => op.type === 'merge' && op.repository === repo);
    expect(fallida?.state).toBe('failed');
    expect(fallida?.error).toBeTruthy();
    expect(fallida?.startedAt).toBeTruthy();
    expect(fallida?.finishedAt).toBeTruthy();
    expect(fallida?.duration).toBeGreaterThanOrEqual(0);
    expect(lock.hayTrabajo(repo)).toBe(false);
    const status = await casos.getRepositoryStatus(repo);
    expect(status.isMerging).toBe(true);
  });

  it('una operación concurrente espera al lock y luego corre', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'concurrencia');
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(path.join(repo, 'nota.md'), 'hola\n');
    await git.add('.');
    await git.commit('nota');
    await git.checkout(ramaBase);

    const orden: string[] = [];
    const liberar = await lock.adquirir(repo, 'pull');
    const mergePromesa = casos.merge(repo, 'feature').then((op) => {
      orden.push('merge');
      return op;
    });

    await new Promise((r) => setTimeout(r, 40));
    expect(orden).toEqual([]);
    expect(lock.hayTrabajo(repo)).toBe(true);

    liberar();
    const operacion = await mergePromesa;
    expect(orden).toEqual(['merge']);
    expect(operacion.state).toBe('completed');
    expect(lock.hayTrabajo(repo)).toBe(false);
  });

  it('dos merges del mismo repo se serializan y ambos terminan en estado final correcto', async () => {
    const { repo, git, ramaBase } = await crearRepo(raiz, 'doble');
    await git.checkoutLocalBranch('alpha');
    fs.writeFileSync(path.join(repo, 'alpha.txt'), 'a\n');
    await git.add('.');
    await git.commit('alpha');
    await git.checkout(ramaBase);
    await git.checkoutLocalBranch('beta');
    fs.writeFileSync(path.join(repo, 'beta.txt'), 'b\n');
    await git.add('.');
    await git.commit('beta');
    await git.checkout(ramaBase);

    const resultados = await Promise.allSettled([
      casos.merge(repo, 'alpha'),
      casos.merge(repo, 'beta'),
    ]);

    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);
    const ops = gestor.listar().filter((op) => op.type === 'merge' && op.repository === repo);
    expect(ops).toHaveLength(2);
    expect(ops.every((op) => op.state === 'completed')).toBe(true);
    expect(lock.hayTrabajo(repo)).toBe(false);
    expect(fs.existsSync(path.join(repo, 'alpha.txt'))).toBe(true);
    expect(fs.existsSync(path.join(repo, 'beta.txt'))).toBe(true);
  });

  it('una lectura no queda bloqueada mientras hay un lock de mutación', async () => {
    const { repo } = await crearRepo(raiz, 'lectura');
    const liberar = await lock.adquirir(repo, 'merge');
    const status = await casos.getRepositoryStatus(repo);
    expect(status.currentBranch).toBeTruthy();
    expect(lock.hayTrabajo(repo)).toBe(true);
    liberar();
    expect(lock.hayTrabajo(repo)).toBe(false);
  });
});

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

describe('Perímetro addRemote (SEC-REM-01)', { timeout: 20_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let casos: GitUseCases;

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-remote-'));
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

  it('acepta un remoto HTTPS y queda registrado', async () => {
    const { repo, git } = await crearRepo(raiz, 'remoto-https');
    await casos.addRemote(repo, 'origin', 'https://github.com/abyssan/inexistente.git');
    const remotos = await git.getRemotes(true);
    expect(remotos.some((r) => r.name === 'origin')).toBe(true);
    expect(remotos.some((r) => r.refs.fetch.includes('https://github.com/abyssan/inexistente.git'))).toBe(true);
  });

  it('rechaza file:// y no deja el remoto en .git/config', async () => {
    const { repo, git } = await crearRepo(raiz, 'remoto-file');
    const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-fuera-git-'));
    try {
      await expect(casos.addRemote(repo, 'escape', `file://${fuera.replace(/\\/g, '/')}`)).rejects.toThrow(
        'file://'
      );
      const remotos = await git.getRemotes(true);
      expect(remotos).toEqual([]);
    } finally {
      fs.rmSync(fuera, { recursive: true, force: true });
    }
  });

  it('rechaza una ruta local absoluta y no registra el remoto', async () => {
    const { repo, git } = await crearRepo(raiz, 'remoto-abs');
    const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-fuera-abs-'));
    try {
      await expect(casos.addRemote(repo, 'local', fuera)).rejects.toThrow();
      const remotos = await git.getRemotes(true);
      expect(remotos).toEqual([]);
    } finally {
      fs.rmSync(fuera, { recursive: true, force: true });
    }
  });

  it('push y pull rechazan un remoto file:// ya persistido', async () => {
    const { repo, git } = await crearRepo(raiz, 'push-file');
    const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-fuera-push-'));
    try {
      await git.addRemote('escape', `file://${fuera.replace(/\\/g, '/')}`);
      await expect(casos.push(repo)).rejects.toThrow('file://');
      await expect(casos.pull(repo)).rejects.toThrow('file://');
      await expect(casos.programarPush(repo)).rejects.toThrow('file://');
      await expect(casos.programarPull(repo)).rejects.toThrow('file://');
    } finally {
      fs.rmSync(fuera, { recursive: true, force: true });
    }
  });

  it('getRemotes oculta credenciales embebidas al mostrar', async () => {
    const { repo, git } = await crearRepo(raiz, 'remoto-creds');
    await git.addRemote('origin', 'https://github.com/abyssan/inexistente.git');
    const remotos = await casos.getRemotes(repo);
    expect(remotos[0]?.fetchUrl).not.toMatch(/:[^/]+@/);
    expect(remotos[0]?.fetchUrl).toContain('github.com');
  });

  it('rechaza nombres de remoto que parecen flags de git', async () => {
    const { repo, git } = await crearRepo(raiz, 'remoto-flag');
    await expect(
      casos.addRemote(repo, '--upload-pack', 'https://github.com/abyssan/inexistente.git')
    ).rejects.toThrow('Nombre de remoto');
    const remotos = await git.getRemotes(true);
    expect(remotos).toEqual([]);
  });
});

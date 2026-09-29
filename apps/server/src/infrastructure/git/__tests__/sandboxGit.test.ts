import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { ejecutarEnClonTemporal } from '../sandboxGit.js';

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

describe('Sandbox de preview (clon temporal)', { timeout: 25_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-sandbox-src-'));
    process.env.PROJECTS_ROOT = raiz;
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

  it('el trabajo en el clon no muta HEAD, refs ni worktree del origen y se borra al terminar', async () => {
    const { repo, git } = await crearRepo(raiz, 'origen');
    fs.writeFileSync(path.join(repo, 'sucio.txt'), 'local\n');
    const head = (await git.revparse(['HEAD'])).trim();
    const refs = await git.raw(['for-each-ref', '--format=%(refname) %(objectname)']);
    const status = await git.raw(['status', '--porcelain=v1']);
    const objetos = (await git.raw(['count-objects'])).trim();

    let rutaSandbox = '';
    await ejecutarEnClonTemporal(repo, async (sandbox) => {
      rutaSandbox = sandbox;
      const gitSandbox = simpleGit(sandbox);
      await gitSandbox.raw(['checkout', '-f', head]);
      fs.writeFileSync(path.join(sandbox, 'solo-sandbox.txt'), 'no debe filtrarse\n');
      await gitSandbox.addConfig('user.email', 'sandbox@abyssan.dev');
      await gitSandbox.addConfig('user.name', 'Sandbox');
      await gitSandbox.add('solo-sandbox.txt');
      await gitSandbox.commit('commit solo en sandbox');
    });

    expect(fs.existsSync(rutaSandbox)).toBe(false);
    expect((await git.revparse(['HEAD'])).trim()).toBe(head);
    expect(await git.raw(['for-each-ref', '--format=%(refname) %(objectname)'])).toBe(refs);
    expect(await git.raw(['status', '--porcelain=v1'])).toBe(status);
    expect((await git.raw(['count-objects'])).trim()).toBe(objetos);
    expect(fs.existsSync(path.join(repo, 'solo-sandbox.txt'))).toBe(false);
    expect(fs.readFileSync(path.join(repo, 'sucio.txt'), 'utf8')).toBe('local\n');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SimpleGit } from 'simple-git';

const { argvCapturados } = vi.hoisted(() => ({
  argvCapturados: [] as unknown[][],
}));

vi.mock('simple-git', async (importOriginal) => {
  const original = await importOriginal<typeof import('simple-git')>();
  const realSimpleGit = original.simpleGit;

  function envolverInstanciaGit(git: SimpleGit): SimpleGit {
    const rawReal = git.raw.bind(git);
    git.raw = ((...args: Parameters<SimpleGit['raw']>) => {
      argvCapturados.push(args);
      return rawReal(...args);
    }) as SimpleGit['raw'];
    const fetchReal = git.fetch.bind(git);
    git.fetch = ((...args: Parameters<SimpleGit['fetch']>) => {
      argvCapturados.push(['fetch', ...args]);
      return fetchReal(...args);
    }) as SimpleGit['fetch'];
    const envReal = git.env.bind(git);
    git.env = ((...args: Parameters<SimpleGit['env']>) =>
      envolverInstanciaGit(envReal(...args))) as SimpleGit['env'];
    return git;
  }

  const simpleGit = (...args: Parameters<typeof realSimpleGit>) =>
    envolverInstanciaGit(realSimpleGit(...args));
  Object.assign(simpleGit, realSimpleGit);

  return { ...original, simpleGit, default: simpleGit };
});

import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../logging/InMemoryCommandLogAdapter.js';
import { almacenCredencialesForja } from '../../credenciales/AlmacenCredencialesForja.js';

const TOKEN = 'ghp_FAKE1234567890123456789012345678';
const REMOTE_HTTPS = 'https://github.com/fake/repo.git';

async function prepararBareYLocal(raiz: string) {
  const bare = path.join(raiz, 'bare.git');
  const upstream = path.join(raiz, 'upstream');
  await simpleGit().init(['-b', 'main', bare, '--bare']);
  await simpleGit().clone(bare, upstream);
  const gitUp = simpleGit(upstream);
  await gitUp.addConfig('user.email', 'test@abyssan.dev');
  await gitUp.addConfig('user.name', 'Test');
  fs.writeFileSync(path.join(upstream, 'f.txt'), 'v1\n');
  await gitUp.add('.');
  await gitUp.commit('init');
  await gitUp.push('origin', 'main');
  return { bare, upstream };
}

describe('SimpleGitAdapter auth sin token en argv/reflog', { timeout: 30_000 }, () => {
  const envOriginal = {
    ABYSSAN_HOME: process.env.ABYSSAN_HOME,
    GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
    GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM,
  };
  let raiz: string;
  let adapter: SimpleGitAdapter;
  let local: string;
  let bare: string;

  beforeEach(async () => {
    argvCapturados.length = 0;
    process.env.GIT_CONFIG_GLOBAL = '/dev/null';
    process.env.GIT_CONFIG_SYSTEM = '/dev/null';
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-git-auth-'));
    process.env.ABYSSAN_HOME = path.join(raiz, 'abyssan-home');
    process.env.ABYSSAN_GITHUB_TOKEN = TOKEN;
    almacenCredencialesForja.guardar({ proveedor: 'github', token: TOKEN, usuario: 'test' });

    const preparado = await prepararBareYLocal(raiz);
    bare = preparado.bare;
    local = path.join(raiz, 'local');
    await simpleGit().clone(bare, local);
    const gitLocal = simpleGit(local);
    await gitLocal.addConfig('user.email', 'test@abyssan.dev');
    await gitLocal.addConfig('user.name', 'Test');
    await gitLocal.remote(['set-url', 'origin', REMOTE_HTTPS]);
    await gitLocal.addConfig(`url.${bare}.insteadOf`, REMOTE_HTTPS);

    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
  });

  afterEach(() => {
    delete process.env.ABYSSAN_GITHUB_TOKEN;
    if (envOriginal.ABYSSAN_HOME !== undefined) process.env.ABYSSAN_HOME = envOriginal.ABYSSAN_HOME;
    else delete process.env.ABYSSAN_HOME;
    if (envOriginal.GIT_CONFIG_GLOBAL !== undefined) process.env.GIT_CONFIG_GLOBAL = envOriginal.GIT_CONFIG_GLOBAL;
    else delete process.env.GIT_CONFIG_GLOBAL;
    if (envOriginal.GIT_CONFIG_SYSTEM !== undefined) process.env.GIT_CONFIG_SYSTEM = envOriginal.GIT_CONFIG_SYSTEM;
    else delete process.env.GIT_CONFIG_SYSTEM;
    fs.rmSync(raiz, { recursive: true, force: true });
  });

  function reflogCompleto(): string {
    const head = fs.readFileSync(path.join(local, '.git', 'logs', 'HEAD'), 'utf8');
    const main = fs.readFileSync(path.join(local, '.git', 'logs', 'refs', 'heads', 'main'), 'utf8');
    return `${head}\n${main}`;
  }

  it('pull no deja el token en reflog ni en la API de reflog', async () => {
    const upstream = path.join(raiz, 'upstream');
    fs.writeFileSync(path.join(upstream, 'f.txt'), 'v1\nv2\n');
    const gitUp = simpleGit(upstream);
    await gitUp.add('f.txt');
    await gitUp.commit('second');
    await gitUp.push('origin', 'main');

    argvCapturados.length = 0;
    await adapter.pull(local, 'merge');

    const argv = JSON.stringify(argvCapturados);
    expect(argv).not.toContain(TOKEN);
    expect(argv).not.toContain('x-access-token');

    const reflog = reflogCompleto();
    expect(reflog).not.toContain(TOKEN);
    expect(reflog).not.toContain('x-access-token');
    expect(reflog).toMatch(/pull --no-rebase --progress/);

    const entradas = await adapter.obtenerReflog(local, 5);
    const texto = JSON.stringify(entradas);
    expect(texto).not.toContain(TOKEN);
  });

  it('fetch y push invocan git.raw sin el token en argv', async () => {
    argvCapturados.length = 0;
    await adapter.fetchRefspec(local, 'origin', '+refs/heads/main:refs/remotes/origin/main');
    expect(JSON.stringify(argvCapturados)).not.toContain(TOKEN);
    expect(JSON.stringify(argvCapturados)).toMatch(/origin/);

    fs.writeFileSync(path.join(local, 'nuevo.txt'), 'x\n');
    const gitLocal = simpleGit(local);
    await gitLocal.add('.');
    await gitLocal.commit('local');

    argvCapturados.length = 0;
    await adapter.push(local);
    const argvPush = JSON.stringify(argvCapturados);
    expect(argvPush).not.toContain(TOKEN);
    expect(argvPush).toMatch(/push/);
  });

  it('obtenerReflog sanitiza entradas ya contaminadas', async () => {
    const logHead = path.join(local, '.git', 'logs', 'HEAD');
    const head = (await simpleGit(local).revparse(['HEAD'])).trim();
    const linea =
      `${head} ${head} Test <test@abyssan.dev> 1700000000 +0000\t` +
      `pull --no-rebase --progress https://x-access-token:${TOKEN}@github.com/u/r main: Fast-forward\n`;
    fs.appendFileSync(logHead, linea);

    const entradas = await adapter.obtenerReflog(local, 5);
    const mensajes = entradas.map((e) => e.mensaje).join('\n');
    expect(mensajes).not.toContain(TOKEN);
    expect(mensajes).toContain('https://***@');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SimpleGit } from 'simple-git';

const { argvCapturados } = vi.hoisted(() => ({
  argvCapturados: [] as unknown[][],
}));

vi.mock('../simpleGitAbyssan.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../simpleGitAbyssan.js')>();
  const { simpleGit: realSimpleGit } = await import('simple-git');
  const { opcionesSimpleGitAbyssan } = original;

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

  function simpleGitAbyssan(
    baseDir?: string | Partial<import('simple-git').SimpleGitOptions>,
    options?: Partial<import('simple-git').SimpleGitOptions>,
  ): SimpleGit {
    if (typeof baseDir === 'string') {
      return envolverInstanciaGit(realSimpleGit(baseDir, { ...opcionesSimpleGitAbyssan, ...options }));
    }
    return envolverInstanciaGit(
      realSimpleGit({ ...opcionesSimpleGitAbyssan, ...baseDir, ...options }),
    );
  }

  return { ...original, simpleGitAbyssan };
});

import { simpleGitAbyssan } from '../simpleGitAbyssan.js';
import { SimpleGitAdapter } from '../SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../logging/InMemoryCommandLogAdapter.js';
import { almacenCredencialesForja } from '../../credenciales/AlmacenCredencialesForja.js';

const TOKEN = 'ghp_FAKE1234567890123456789012345678';

async function prepararBareYLocal(raiz: string) {
  const bare = path.join(raiz, 'bare.git');
  const upstream = path.join(raiz, 'upstream');
  await simpleGitAbyssan().init(['-b', 'main', bare, '--bare']);
  await simpleGitAbyssan().clone(bare, upstream);
  const gitUp = simpleGitAbyssan(upstream);
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
    ABYSSAN_GITHUB_TOKEN: process.env.ABYSSAN_GITHUB_TOKEN,
  };
  let raiz: string;
  let adapter: SimpleGitAdapter;
  let local: string;
  let bare: string;
  let credencialRemotoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    argvCapturados.length = 0;
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-git-auth-'));
    process.env.ABYSSAN_HOME = path.join(raiz, 'abyssan-home');
    process.env.ABYSSAN_GITHUB_TOKEN = TOKEN;
    almacenCredencialesForja.guardar({ proveedor: 'github', token: TOKEN, usuario: 'test' });

    const preparado = await prepararBareYLocal(raiz);
    bare = preparado.bare;
    local = path.join(raiz, 'local');
    await simpleGitAbyssan().clone(bare, local);
    const gitLocal = simpleGitAbyssan(local);
    await gitLocal.addConfig('user.email', 'test@abyssan.dev');
    await gitLocal.addConfig('user.name', 'Test');
    // Remoto local (ruta absoluta al bare). Sin url.insteadOf (bloqueado en simple-git 4).
    await gitLocal.remote(['set-url', 'origin', bare]);

    credencialRemotoSpy = vi
      .spyOn(SimpleGitAdapter.prototype as never, 'credencialRemoto')
      .mockResolvedValue({
        urlPlana: 'https://github.com/fake/repo.git',
        forja: 'github',
        token: TOKEN,
        nombreRemoto: 'origin',
      });

    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
  });

  afterEach(() => {
    credencialRemotoSpy.mockRestore();
    delete process.env.ABYSSAN_GITHUB_TOKEN;
    if (envOriginal.ABYSSAN_HOME !== undefined) process.env.ABYSSAN_HOME = envOriginal.ABYSSAN_HOME;
    else delete process.env.ABYSSAN_HOME;
    if (envOriginal.ABYSSAN_GITHUB_TOKEN !== undefined) {
      process.env.ABYSSAN_GITHUB_TOKEN = envOriginal.ABYSSAN_GITHUB_TOKEN;
    }
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
    const gitUp = simpleGitAbyssan(upstream);
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
    const gitLocal = simpleGitAbyssan(local);
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
    const head = (await simpleGitAbyssan(local).revparse(['HEAD'])).trim();
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

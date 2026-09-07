import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../logging/InMemoryCommandLogAdapter.js';

function posix(p: string): string {
  return p.replace(/\\/g, '/');
}

describe('obtenerIdentidad', () => {
  let raiz: string;
  let adapter: SimpleGitAdapter;
  const envOriginal = {
    GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
    GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM,
    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME,
    GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL,
  };

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-identidad-'));
    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
    const git = simpleGit(raiz);
    await git.init();
    process.env.GIT_CONFIG_NOSYSTEM = '1';
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
    delete process.env.GIT_COMMITTER_NAME;
    delete process.env.GIT_COMMITTER_EMAIL;
  });

  afterEach(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
    for (const [clave, valor] of Object.entries(envOriginal)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  });

  it('lee user.name/email globales vía include (identidad del host en Docker)', async () => {
    const hostConfig = path.join(raiz, 'gitconfig-host');
    const globalConfig = path.join(raiz, 'gitconfig-global');
    fs.writeFileSync(hostConfig, '[user]\n\tname = Kevin Host\n\temail = kevin.host@abyssan.dev\n');
    fs.writeFileSync(globalConfig, `[include]\n\tpath = ${posix(hostConfig)}\n`);
    process.env.GIT_CONFIG_GLOBAL = globalConfig;

    const identidad = await adapter.obtenerIdentidad(raiz);

    expect(identidad).toEqual({
      nombre: 'Kevin Host',
      correo: 'kevin.host@abyssan.dev',
      alcance: 'global',
    });
  });

  it('prioriza la identidad local del repositorio sobre la global', async () => {
    const globalConfig = path.join(raiz, 'gitconfig-global');
    fs.writeFileSync(globalConfig, '[user]\n\tname = Global\n\temail = global@abyssan.dev\n');
    process.env.GIT_CONFIG_GLOBAL = globalConfig;
    const git = simpleGit(raiz);
    await git.addConfig('user.name', 'Local');
    await git.addConfig('user.email', 'local@abyssan.dev');

    const identidad = await adapter.obtenerIdentidad(raiz);

    expect(identidad).toEqual({
      nombre: 'Local',
      correo: 'local@abyssan.dev',
      alcance: 'local',
    });
  });

  it('usa GIT_AUTHOR_* si no hay config local ni global', async () => {
    const globalConfig = path.join(raiz, 'gitconfig-global-vacio');
    fs.writeFileSync(globalConfig, '# sin user\n');
    process.env.GIT_CONFIG_GLOBAL = globalConfig;
    process.env.GIT_AUTHOR_NAME = 'Autor Env';
    process.env.GIT_AUTHOR_EMAIL = 'autor.env@abyssan.dev';

    const identidad = await adapter.obtenerIdentidad(raiz);

    expect(identidad).toEqual({
      nombre: 'Autor Env',
      correo: 'autor.env@abyssan.dev',
      alcance: 'global',
    });
  });
});

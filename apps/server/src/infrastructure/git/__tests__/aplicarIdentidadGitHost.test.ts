import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { aplicarIdentidadGitHost } from '../aplicarIdentidadGitHost.js';

describe('aplicarIdentidadGitHost', () => {
  let raiz: string;
  const envOriginal = {
    GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
    GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM,
  };

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-id-host-'));
    process.env.GIT_CONFIG_NOSYSTEM = '1';
    process.env.GIT_CONFIG_GLOBAL = path.join(raiz, 'gitconfig-global');
    fs.writeFileSync(
      process.env.GIT_CONFIG_GLOBAL,
      "[include]\n\tpath = /host-gitconfig\n[safe]\n\tdirectory = '*'\n"
    );
  });

  afterEach(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
    for (const [clave, valor] of Object.entries(envOriginal)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  });

  it('copia solo nombre y correo y no importa safe.directory de Windows', { timeout: 15_000 }, async () => {
    const host = path.join(raiz, 'gitconfig-host');
    fs.writeFileSync(
      host,
      "[user]\n\tname = Kevin Host\n\temail = kevin.host@abyssan.dev\n[safe]\n\tdirectory = C:/xampp/htdocs/corresrh/lector-pdf\n"
    );

    const aplicada = await aplicarIdentidadGitHost(host);
    expect(aplicada).toBe(true);

    const git = simpleGit();
    expect((await git.raw(['config', '--global', '--get', 'user.name'])).trim()).toBe('Kevin Host');
    expect((await git.raw(['config', '--global', '--get', 'user.email'])).trim()).toBe('kevin.host@abyssan.dev');

    let include = '';
    try {
      include = (await git.raw(['config', '--global', '--get', 'include.path'])).trim();
    } catch {
      include = '';
    }
    expect(include).toBe('');

    const listado = await git.raw(['config', '--global', '--list']);
    expect(listado).not.toContain('C:/xampp');
  });

  it('no toca el gitconfig global si el archivo host no existe', async () => {
    const aplicada = await aplicarIdentidadGitHost(path.join(raiz, 'no-existe'));
    expect(aplicada).toBe(false);
    const listado = await simpleGit().raw(['config', '--global', '--list']);
    expect(listado).toContain('include.path');
  });
});

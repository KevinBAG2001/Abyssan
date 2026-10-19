import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';

async function headDe(repo: string): Promise<string> {
  return (await simpleGit(repo).raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
}

async function repoConDosRamas(raiz: string, nombre: string) {
  const repo = path.join(raiz, nombre);
  fs.mkdirSync(repo, { recursive: true });
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@abyssan.dev');
  await git.addConfig('user.name', 'Test Abyssan');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  await git.add('.');
  await git.commit('inicial');
  const hashInicial = (await git.raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
  const ramaPrincipal = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  await git.checkoutLocalBranch('feature');
  fs.writeFileSync(path.join(repo, 'f.txt'), 'f\n');
  await git.add('.');
  await git.commit('en feature');
  const hashFeature = (await git.raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
  await git.checkout(ramaPrincipal);
  return { repo, git, hashInicial, hashFeature, ramaPrincipal };
}

async function crearRepoSimple(raiz: string, nombre: string) {
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

describe('Precondiciones de deshacer (auditoría B2/B3)', { timeout: 40_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let dirJournal: string;
  let casos: GitUseCases;
  let journal: JournalOperaciones;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-desh-'));
    dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-deshj-'));
    process.env.PROJECTS_ROOT = raiz;
    journal = new JournalOperaciones(dirJournal);
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
      fs.rmSync(dirJournal, { recursive: true, force: true });
    } catch {
      // lock de git
    }
  });

  it('rechaza deshacer si cambiaste de rama fuera de Abyssan (commit en main, checkout feature)', async () => {
    const { repo, git, hashInicial, hashFeature, ramaPrincipal } = await repoConDosRamas(raiz, 'rama-ext');
    fs.writeFileSync(path.join(repo, 'b.txt'), 'b\n');
    await casos.stage(repo, 'b.txt');
    await casos.commit(repo, 'commit en main');

    const hashMainTrasCommit = (await git.raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
    expect(hashMainTrasCommit).not.toBe(hashInicial);

    await git.checkout('feature');
    expect((await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim()).toBe('feature');
    expect(await headDe(repo)).toBe(hashFeature);

    await expect(casos.deshacer(repo)).rejects.toThrow(/rama activa|HEAD distinto/i);

    expect(await headDe(repo)).toBe(hashFeature);
    await git.checkout(ramaPrincipal);
    expect(await headDe(repo)).toBe(hashMainTrasCommit);
    expect(fs.existsSync(path.join(repo, 'b.txt'))).toBe(true);
  });

  it('rechaza deshacer si HEAD avanzó con un commit externo', async () => {
    const { repo, git } = await crearRepoSimple(raiz, 'head-ext');
    fs.writeFileSync(path.join(repo, 'nuevo.ts'), 'x\n');
    await casos.stage(repo, 'nuevo.ts');
    await casos.commit(repo, 'desde abyssan');

    fs.writeFileSync(path.join(repo, 'otro.ts'), 'y\n');
    await git.add('.');
    await git.commit('commit externo');
    const headExterno = await headDe(repo);

    await expect(casos.deshacer(repo)).rejects.toThrow(/HEAD distinto/i);
    expect(await headDe(repo)).toBe(headExterno);
  });

  it('deshacer commit normal sigue funcionando con anclas de rama y HEAD', async () => {
    const { repo } = await crearRepoSimple(raiz, 'undo-ok');
    const antes = await headDe(repo);
    fs.writeFileSync(path.join(repo, 'cambio.txt'), 'z\n');
    await casos.stage(repo, 'cambio.txt');
    await casos.commit(repo, 'cambio válido');

    const punta = journal.punta(repo);
    expect(punta?.despues?.rama).toBeTruthy();
    expect(punta?.despues?.head).toBeTruthy();

    await casos.deshacer(repo);
    expect(await headDe(repo)).toBe(antes);
    const status = await casos.getRepositoryStatus(repo);
    expect(status.files.some((f) => f.path.replace(/\\/g, '/') === 'cambio.txt')).toBe(true);
  });

  it('marcarNoDeshacer solo afecta al repositorio indicado', async () => {
    const { repo: repoA } = await crearRepoSimple(raiz, 'repo-a');
    const { repo: repoB } = await crearRepoSimple(raiz, 'repo-b');

    fs.writeFileSync(path.join(repoA, 'a.ts'), 'a\n');
    await casos.stage(repoA, 'a.ts');
    await casos.commit(repoA, 'commit A');

    fs.writeFileSync(path.join(repoB, 'b.ts'), 'b\n');
    await casos.stage(repoB, 'b.ts');
    await casos.commit(repoB, 'commit B');

    journal.marcarNoDeshacer(repoB, 'Simula push en repo B');

    const ultimaA = casos.obtenerUltimaOperacion(repoA);
    expect(ultimaA.puedeDeshacer).toBe(true);
    const ultimaB = casos.obtenerUltimaOperacion(repoB);
    expect(ultimaB.puedeDeshacer).toBe(false);

    await casos.deshacer(repoA);
    const statusA = await casos.getRepositoryStatus(repoA);
    expect(statusA.files.some((f) => f.path.replace(/\\/g, '/') === 'a.ts')).toBe(true);
  });

  it('entradas antiguas sin rama en journal: solo exige coincidencia de HEAD', async () => {
    const { repo, git } = await crearRepoSimple(raiz, 'legacy');
    fs.writeFileSync(path.join(repo, 'legacy.txt'), 'l\n');
    await casos.stage(repo, 'legacy.txt');
    const hashNuevo = await casos.commit(repo, 'con ancla head');

    const ruta = path.join(dirJournal, 'journal.json');
    const doc = JSON.parse(fs.readFileSync(ruta, 'utf8')) as {
      entradas: Array<{ despues?: { head?: string; rama?: string } }>;
    };
    const ultima = doc.entradas[doc.entradas.length - 1];
    if (ultima.despues) delete ultima.despues.rama;
    fs.writeFileSync(ruta, JSON.stringify(doc));
    journal.recargar();

    await casos.deshacer(repo);
    expect(await headDe(repo)).not.toBe(hashNuevo);
    expect((await git.status()).isClean()).toBe(false);
  });
});

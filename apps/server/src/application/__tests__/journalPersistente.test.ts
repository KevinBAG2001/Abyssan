import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';
import { restaurarSnapshot } from '../../infrastructure/deshacer/SnapshotArchivos.js';

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

describe('Journal persistente (Fase 4.2)', { timeout: 25_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let dirJournal: string;
  let journal: JournalOperaciones;
  let casos: GitUseCases;

  beforeEach(async () => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-j-'));
    dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-jh-'));
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
      // lock de git en Windows
    }
  });

  it('deshacer commit sobrevive recargar el journal (restart)', async () => {
    const { repo } = await crearRepo(raiz, 'restart');
    fs.writeFileSync(path.join(repo, 'nuevo.ts'), 'export const x = 1;\n');
    await casos.stage(repo, 'nuevo.ts');
    await casos.commit(repo, 'añade nuevo.ts');

    const journalTrasReinicio = new JournalOperaciones(dirJournal);
    const casosTrasReinicio = new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      journalTrasReinicio
    );
    const ultima = casosTrasReinicio.obtenerUltimaOperacion(repo);
    expect(ultima.puedeDeshacer).toBe(true);

    await casosTrasReinicio.deshacer(repo);
    const status = await casosTrasReinicio.getRepositoryStatus(repo);
    expect(status.files.some((f) => f.path.replace(/\\/g, '/') === 'nuevo.ts')).toBe(true);
  });

  it('reset hard de un archivo sucio se restaura desde el snapshot', async () => {
    const { repo } = await crearRepo(raiz, 'reset-hard');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'sucio\n');
    await casos.reset(repo, 'hard', 'HEAD');
    expect(fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8').replace(/\r\n/g, '\n')).toBe('hola\n');

    await casos.deshacer(repo);
    expect(fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8').replace(/\r\n/g, '\n')).toBe('sucio\n');
  });

  it('discard restaura desde snapshot, no desde el JSON del journal', async () => {
    const { repo } = await crearRepo(raiz, 'discard-snap');
    const secreto = 'SECRETO_JOURNAL_NO_DEBE_PERSISTIR';
    fs.writeFileSync(path.join(repo, 'archivo.txt'), `${secreto}\n`);
    await casos.discardArchivo(repo, 'archivo.txt');
    expect(fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8').replace(/\r\n/g, '\n')).toBe('hola\n');

    const bruto = fs.readFileSync(path.join(dirJournal, 'journal.json'), 'utf8');
    expect(bruto).not.toContain(secreto);

    await casos.deshacer(repo);
    expect(fs.readFileSync(path.join(repo, 'archivo.txt'), 'utf8')).toContain(secreto);
  });

  it('pull queda en la timeline deshabilitado con motivo', async () => {
    const { repo } = await crearRepo(raiz, 'pull-block');
    journal.registrar({
      tipo: 'pull',
      repoPath: repo,
      descripcion: 'Pull (merge)',
      puedeDeshacer: false,
      motivoBloqueo: 'Un pull no se deshace en un paso seguro; usa reflog si hace falta.',
      payload: { modo: 'merge' },
    });
    const lista = casos.listarJournal(repo);
    expect(lista[0].puedeDeshacer).toBe(false);
    expect(lista[0].motivoBloqueo).toMatch(/pull/i);
    await expect(casos.deshacer(repo)).rejects.toThrow(/pull/i);
  });

  it('el journal público no incluye payload ni contenidos de archivo', async () => {
    const { repo } = await crearRepo(raiz, 'publico');
    journal.registrar({
      tipo: 'discard',
      repoPath: repo,
      descripcion: 'Descartado archivo.txt',
      puedeDeshacer: true,
      payload: { filePath: 'archivo.txt', contenido: 'NO_DEBE_SALIR', existia: '1' },
    });
    const lista = casos.listarJournal(repo);
    expect(lista[0]).not.toHaveProperty('payload');
    expect(JSON.stringify(lista)).not.toContain('NO_DEBE_SALIR');
    expect(lista[0].comandoGit).toContain('git restore');
    expect(lista[0].estadoAnterior.length).toBeGreaterThan(0);
  });

  it('restaurar snapshot rechaza path traversal en el manifiesto', async () => {
    const { repo } = await crearRepo(raiz, 'snap-sec');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'sucio\n');
    await casos.discardArchivo(repo, 'archivo.txt');
    const snapDir = path.join(dirJournal, 'snapshots');
    const ids = fs.readdirSync(snapDir);
    expect(ids.length).toBeGreaterThan(0);
    const id = ids[0];
    const manifestPath = path.join(snapDir, id, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ archivos: [path.join('..', '..', 'secret.txt')], omitidos: [] }),
      'utf8'
    );
    expect(() => restaurarSnapshot(id, repo, dirJournal)).toThrow();
  });

  it('el journal está acotado por repositorio', () => {
    const repo = path.join(raiz, 'cap');
    fs.mkdirSync(repo, { recursive: true });
    for (let i = 0; i < 70; i++) {
      journal.registrar({
        tipo: 'commit',
        repoPath: repo,
        descripcion: `Commit ${i}`,
        puedeDeshacer: true,
        payload: { hashAnterior: 'abc', hashNuevo: `n${i}` },
      });
    }
    expect(journal.listar(repo).length).toBeLessThanOrEqual(60);
  });
});

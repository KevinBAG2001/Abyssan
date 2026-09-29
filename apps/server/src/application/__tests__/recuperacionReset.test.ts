import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';
import { JournalOperaciones } from '../deshacer/JournalOperaciones.js';
import { construirRefRecuperacion } from '../../infrastructure/seguridad/politicaRefs.js';

async function headDe(repo: string): Promise<string> {
  return (await simpleGit(repo).raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
}

async function refsRecuperacion(repo: string): Promise<string> {
  return (await simpleGit(repo).raw(['for-each-ref', '--format=%(refname) %(objectname)', 'refs/abyssan/recovery'])).trim();
}

function texto(repo: string, relativo: string): string {
  return fs.readFileSync(path.join(repo, relativo), 'utf8').replace(/\r\n/g, '\n');
}

async function repoConHistoria(raiz: string, nombre: string) {
  const repo = path.join(raiz, nombre);
  fs.mkdirSync(repo, { recursive: true });
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@abyssan.dev');
  await git.addConfig('user.name', 'Test Abyssan');
  fs.writeFileSync(path.join(repo, 'archivo.txt'), 'a\n');
  await git.add('.');
  await git.commit('a');
  const hashA = (await git.raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
  fs.writeFileSync(path.join(repo, 'archivo.txt'), 'b\n');
  await git.add('.');
  await git.commit('b');
  const hashB = (await git.raw(['rev-parse', 'HEAD'])).trim().toLowerCase();
  return { repo, hashA, hashB };
}

describe('Recuperación de reset (bloque F)', { timeout: 40_000 }, () => {
  const raizOriginal = process.env.PROJECTS_ROOT;
  let raiz: string;
  let dirJournal: string;
  let journal: JournalOperaciones;
  let adapter: SimpleGitAdapter;
  let casos: GitUseCases;

  function nuevosCasos(): GitUseCases {
    return new GitUseCases(
      new SimpleGitAdapter(new InMemoryCommandLogAdapter()),
      new InMemoryCommandLogAdapter(),
      new JournalOperaciones(dirJournal)
    );
  }

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-rec-'));
    dirJournal = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-recj-'));
    process.env.PROJECTS_ROOT = raiz;
    journal = new JournalOperaciones(dirJournal);
    adapter = new SimpleGitAdapter(new InMemoryCommandLogAdapter());
    casos = new GitUseCases(adapter, new InMemoryCommandLogAdapter(), journal);
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

  it('ancla HEAD en el repositorio y lo recupera con una instancia nueva', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'restart');
    await casos.reset(repo, 'hard', hashA);
    expect(await headDe(repo)).toBe(hashA);

    const punta = journal.punta(repo);
    expect(punta?.estado).toBe('completada');
    expect(punta?.antes?.head).toBe(hashB);
    expect(punta?.despues?.head).toBe(hashA);
    expect(punta?.recuperacion?.estrategia).toBe('ref_temporal');
    expect(punta?.recuperacion?.ref).toBe(construirRefRecuperacion(punta!.id));
    expect((await simpleGit(repo).raw(['rev-parse', punta!.recuperacion!.ref!])).trim().toLowerCase()).toBe(hashB);

    const publica = casos.listarJournal(repo);
    expect(publica[0].estado).toBe('completada');
    expect(publica[0].estrategiaRecuperacion).toBe('ref_temporal');
    expect(publica[0].comandoGit).toContain('refs/abyssan/recovery/');
    expect(JSON.stringify(publica)).not.toContain(hashB);

    const huerfana = punta!.id === 'b'.repeat(16) ? 'c'.repeat(16) : 'b'.repeat(16);
    await adapter.anclarRefRecuperacion(repo, construirRefRecuperacion(huerfana), hashA);

    const casosTrasReinicio = nuevosCasos();
    await casosTrasReinicio.deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
    expect(texto(repo, 'archivo.txt')).toBe('b\n');
    expect(await refsRecuperacion(repo)).toBe('');
  });

  it('no restaura HEAD si falta la ref, aunque el journal recuerde el hash', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'sin-ref');
    await casos.reset(repo, 'hard', hashA);
    const ref = journal.punta(repo)!.recuperacion!.ref!;
    await simpleGit(repo).raw(['update-ref', '-d', ref]);

    const casosTrasReinicio = nuevosCasos();
    await expect(casosTrasReinicio.deshacer(repo)).rejects.toThrow(/ref de recuperación/);
    expect(await headDe(repo)).toBe(hashA);
    expect(hashB).not.toBe(hashA);
  });

  it('recupera desde la ref aunque el journal ya no tenga el hash', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'sin-hash');
    await casos.reset(repo, 'hard', hashA);
    const ruta = path.join(dirJournal, 'journal.json');
    const doc = JSON.parse(fs.readFileSync(ruta, 'utf8')) as {
      entradas: Array<{ recuperacion?: { hash?: string }; payload: Record<string, string> }>;
    };
    const ultima = doc.entradas[doc.entradas.length - 1];
    delete ultima.recuperacion?.hash;
    ultima.payload.hashAnterior = '';
    fs.writeFileSync(ruta, JSON.stringify(doc));

    await nuevosCasos().deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
  });

  it('aborta si la ref no coincide con el HEAD registrado', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'mismatch');
    await casos.reset(repo, 'hard', hashA);
    const ruta = path.join(dirJournal, 'journal.json');
    const doc = JSON.parse(fs.readFileSync(ruta, 'utf8')) as {
      entradas: Array<{ recuperacion?: { hash?: string; ref?: string } }>;
    };
    const ultima = doc.entradas[doc.entradas.length - 1];
    ultima.recuperacion!.hash = hashA;
    fs.writeFileSync(ruta, JSON.stringify(doc));

    await expect(nuevosCasos().deshacer(repo)).rejects.toThrow(/no coincide/);
    expect(await headDe(repo)).toBe(hashA);
    expect((await simpleGit(repo).raw(['rev-parse', ultima.recuperacion!.ref!])).trim().toLowerCase()).toBe(hashB);
  });

  it('un reset que falla no promete recuperación y no deja la ref', async () => {
    const { repo, hashB } = await repoConHistoria(raiz, 'fallo');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'sucio\n');
    await expect(casos.reset(repo, 'hard', 'rama-que-no-existe')).rejects.toThrow();

    expect(await headDe(repo)).toBe(hashB);
    expect(texto(repo, 'archivo.txt')).toBe('sucio\n');
    expect(await refsRecuperacion(repo)).toBe('');
    const lista = casos.listarJournal(repo);
    expect(lista[0].estado).toBe('fallida');
    expect(lista[0].puedeDeshacer).toBe(false);
    await expect(casos.deshacer(repo)).rejects.toThrow();
    const snaps = path.join(dirJournal, 'snapshots');
    if (fs.existsSync(snaps)) {
      expect(fs.readdirSync(snaps)).toEqual([]);
    }
  });

  it('un reset interrumpido se recupera al leer el journal desde disco', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'corte');
    const entrada = journal.iniciar({
      tipo: 'reset',
      repoPath: repo,
      descripcion: 'Reset interrumpido',
      puedeDeshacer: false,
      payload: { type: 'hard', target: hashA, hashAnterior: hashB },
      antes: { head: hashB },
      recuperacion: { estrategia: 'ref_temporal', hash: hashB, disponible: false },
    });
    const ref = construirRefRecuperacion(entrada.id);
    await adapter.anclarRefRecuperacion(repo, ref, hashB);
    journal.actualizarRecuperacion(
      entrada.id,
      { estrategia: 'ref_temporal', ref, hash: hashB, disponible: true },
      true
    );
    await adapter.reset(repo, 'hard', hashA);
    expect(await headDe(repo)).toBe(hashA);

    await nuevosCasos().deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
    expect(await refsRecuperacion(repo)).toBe('');
  });

  it('el reset soft vuelve a HEAD y no reescribe el worktree en la recuperación', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'soft');
    await casos.reset(repo, 'soft', hashA);
    expect(await headDe(repo)).toBe(hashA);
    expect(texto(repo, 'archivo.txt')).toBe('b\n');

    await casos.deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
    expect(texto(repo, 'archivo.txt')).toBe('b\n');
    expect((await simpleGit(repo).raw(['status', '--porcelain'])).trim()).toBe('');
  });

  it('el reset mixed recupera HEAD y conserva el worktree sucio; el índice previo no', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'mixed');
    fs.writeFileSync(path.join(repo, 'archivo.txt'), 'sucio\n');
    await casos.reset(repo, 'mixed', hashA);
    expect(await headDe(repo)).toBe(hashA);
    expect(texto(repo, 'archivo.txt')).toBe('sucio\n');

    await casos.deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
    expect(texto(repo, 'archivo.txt')).toBe('sucio\n');
    const index = await simpleGit(repo).raw(['diff', '--cached', '--name-only']);
    expect(index).toContain('archivo.txt');
  });

  it('con varias operaciones solo deshace la punta; el reset sigue anclado', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'varias');
    await casos.reset(repo, 'hard', hashA);
    fs.writeFileSync(path.join(repo, 'nuevo.ts'), 'export const x = 1;\n');
    await casos.stage(repo, 'nuevo.ts');
    await casos.commit(repo, 'nuevo');

    await casos.deshacer(repo);
    expect(await headDe(repo)).toBe(hashA);
    expect(await refsRecuperacion(repo)).toContain('refs/abyssan/recovery/');

    await casos.deshacer(repo);
    expect(await headDe(repo)).toBe(hashB);
    expect(texto(repo, 'archivo.txt')).toBe('b\n');
    expect(await refsRecuperacion(repo)).toBe('');
  });

  it('un journal ilegible no borra la ref de recuperación', async () => {
    const { repo, hashA, hashB } = await repoConHistoria(raiz, 'corrupto');
    await casos.reset(repo, 'hard', hashA);
    const ref = journal.punta(repo)!.recuperacion!.ref!;
    fs.writeFileSync(path.join(dirJournal, 'journal.json'), '{');

    const casosCorruptos = nuevosCasos();
    await expect(casosCorruptos.deshacer(repo)).rejects.toThrow(/operación reciente/);
    expect((await simpleGit(repo).raw(['rev-parse', ref])).trim().toLowerCase()).toBe(hashB);
    expect(await headDe(repo)).toBe(hashA);
  });

  it('al podar, la ref de la entrada vieja sale del índice', () => {
    const repo = path.join(raiz, 'cap');
    fs.mkdirSync(repo, { recursive: true });
    const primera = `refs/abyssan/recovery/${'a'.repeat(16)}`;
    journal.registrar({
      tipo: 'reset',
      repoPath: repo,
      descripcion: 'primera',
      puedeDeshacer: true,
      payload: { type: 'hard', hashAnterior: 'b'.repeat(40) },
      recuperacion: {
        estrategia: 'ref_temporal',
        ref: primera,
        hash: 'b'.repeat(40),
        disponible: true,
      },
    });
    for (let i = 0; i < 60; i++) {
      const id = (i + 1).toString(16).padStart(16, '0');
      journal.registrar({
        tipo: 'reset',
        repoPath: repo,
        descripcion: `r${i}`,
        puedeDeshacer: true,
        payload: { type: 'hard', hashAnterior: 'c'.repeat(40) },
        recuperacion: {
          estrategia: 'ref_temporal',
          ref: `refs/abyssan/recovery/${id}`,
          hash: 'c'.repeat(40),
          disponible: true,
        },
      });
    }
    const vivas = journal.refsRecuperacionVivas(repo);
    expect(vivas).not.toContain(primera);
    expect(vivas).toHaveLength(60);
  });

  it('anclar una rama del usuario se rechaza antes de escribir', async () => {
    const { repo, hashB } = await repoConHistoria(raiz, 'segura');
    const antes = await headDe(repo);
    await expect(adapter.anclarRefRecuperacion(repo, 'refs/heads/main', hashB)).rejects.toThrow(/recuperación/);
    expect(await headDe(repo)).toBe(antes);
    expect(await refsRecuperacion(repo)).toBe('');
  });
});

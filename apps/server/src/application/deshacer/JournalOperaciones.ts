import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { obtenerDirAbyssan, sanitizarTextoAuditoria } from '../../infrastructure/auditoria/AuditoriaJsonlAdapter.js';
import { borrarSnapshot, contarArchivosSnapshot } from '../../infrastructure/deshacer/SnapshotArchivos.js';
import { comandoGitDeOperacion, estadoAnteriorDeOperacion } from './describirOperacion.js';
import type {
  DatosRegistroJournal,
  EntradaJournal,
  EntradaJournalPublica,
  UltimaOperacion,
} from './tiposJournal.js';

const MAX_POR_REPO = 60;
const MAX_TOTAL = 200;
const CLAVES_SENSIBLES = /^(contenido|content|token|password|secret|authorization)$/i;

type DocumentoJournal = { version: 1; entradas: EntradaJournal[] };

function payloadSeguro(payload: Record<string, string>): Record<string, string> {
  const limpio: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(payload)) {
    if (CLAVES_SENSIBLES.test(clave)) continue;
    limpio[clave] = sanitizarTextoAuditoria(String(valor ?? '')).slice(0, 240);
  }
  return limpio;
}

export class JournalOperaciones {
  private entradas: EntradaJournal[] = [];
  private cargado = false;

  constructor(private readonly dirBase?: string) {}

  directorioPersistencia(): string | undefined {
    return this.dirBase;
  }

  private directorio(): string {
    return this.dirBase ?? obtenerDirAbyssan();
  }

  private rutaArchivo(): string {
    return path.join(this.directorio(), 'journal.json');
  }

  recargar(): void {
    this.cargado = true;
    const archivo = this.rutaArchivo();
    if (!fs.existsSync(archivo)) {
      this.entradas = [];
      return;
    }
    try {
      const bruto = fs.readFileSync(archivo, 'utf8');
      const doc = JSON.parse(bruto) as DocumentoJournal;
      this.entradas = Array.isArray(doc.entradas) ? doc.entradas : [];
    } catch {
      this.entradas = [];
    }
  }

  private asegurarCargado(): void {
    if (!this.cargado) this.recargar();
  }

  private persistir(): void {
    this.asegurarCargado();
    const dir = this.directorio();
    fs.mkdirSync(dir, { recursive: true });
    const doc: DocumentoJournal = { version: 1, entradas: this.entradas };
    const destino = this.rutaArchivo();
    const tmp = `${destino}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(doc)}\n`, 'utf8');
    try {
      fs.renameSync(tmp, destino);
    } catch {
      fs.copyFileSync(tmp, destino);
      fs.unlinkSync(tmp);
    }
  }

  private podar(): void {
    if (this.entradas.length > MAX_TOTAL) {
      const extra = this.entradas.splice(0, this.entradas.length - MAX_TOTAL);
      for (const e of extra) {
        if (e.snapshotId) borrarSnapshot(e.snapshotId, this.dirBase);
      }
    }
    const porRepo = new Map<string, EntradaJournal[]>();
    for (const e of this.entradas) {
      const lista = porRepo.get(e.repoPath) ?? [];
      lista.push(e);
      porRepo.set(e.repoPath, lista);
    }
    const vivos = new Set(this.entradas.map((e) => e.id));
    for (const [, lista] of porRepo) {
      if (lista.length <= MAX_POR_REPO) continue;
      const recorte = lista.slice(0, lista.length - MAX_POR_REPO);
      for (const e of recorte) {
        if (e.snapshotId) borrarSnapshot(e.snapshotId, this.dirBase);
        vivos.delete(e.id);
      }
    }
    this.entradas = this.entradas.filter((e) => vivos.has(e.id));
  }

  registrar(op: DatosRegistroJournal): EntradaJournal {
    this.asegurarCargado();
    const payload = payloadSeguro(op.payload);
    const archivos = contarArchivosSnapshot(op.snapshotId, this.dirBase);
    const entrada: EntradaJournal = {
      id: randomBytes(8).toString('hex'),
      tipo: op.tipo,
      repoPath: op.repoPath,
      descripcion: sanitizarTextoAuditoria(op.descripcion).slice(0, 240),
      puedeDeshacer: op.puedeDeshacer,
      motivoBloqueo: op.motivoBloqueo
        ? sanitizarTextoAuditoria(op.motivoBloqueo).slice(0, 240)
        : undefined,
      payload,
      snapshotId: op.snapshotId,
      comandoGit: op.comandoGit ?? comandoGitDeOperacion(op.tipo, payload),
      estadoAnterior: op.estadoAnterior ?? estadoAnteriorDeOperacion(op.tipo, payload, archivos),
      timestamp: new Date().toISOString(),
      deshecha: false,
    };
    this.entradas.push(entrada);
    this.podar();
    this.persistir();
    return entrada;
  }

  listar(repoPath: string): EntradaJournalPublica[] {
    this.asegurarCargado();
    const delRepo = this.entradas
      .filter((e) => e.repoPath === repoPath)
      .slice()
      .reverse();
    const punta = delRepo.find((e) => !e.deshecha);
    return delRepo.map((e) => this.publica(e, e.id === punta?.id));
  }

  obtener(repoPath?: string): UltimaOperacion | null {
    this.asegurarCargado();
    const candidatas = this.entradas.filter((e) => !e.deshecha && (!repoPath || e.repoPath === repoPath));
    const actual = candidatas[candidatas.length - 1];
    if (!actual) return null;
    return this.aUltima(actual);
  }

  obtenerPorId(id: string): EntradaJournal | null {
    this.asegurarCargado();
    return this.entradas.find((e) => e.id === id) ?? null;
  }

  punta(repoPath: string): EntradaJournal | null {
    this.asegurarCargado();
    const delRepo = this.entradas.filter((e) => e.repoPath === repoPath && !e.deshecha);
    return delRepo[delRepo.length - 1] ?? null;
  }

  marcarNoDeshacer(motivo: string): void {
    this.asegurarCargado();
    const actual = this.entradas.filter((e) => !e.deshecha).at(-1);
    if (!actual) return;
    actual.puedeDeshacer = false;
    actual.motivoBloqueo = sanitizarTextoAuditoria(motivo).slice(0, 240);
    this.persistir();
  }

  marcarDeshecha(id: string): void {
    this.asegurarCargado();
    const entrada = this.entradas.find((e) => e.id === id);
    if (!entrada) return;
    entrada.deshecha = true;
    entrada.puedeDeshacer = false;
    entrada.motivoBloqueo = 'Ya se deshizo';
    this.persistir();
  }

  limpiar(): void {
    this.cargado = true;
    for (const e of this.entradas) {
      if (e.snapshotId) borrarSnapshot(e.snapshotId, this.dirBase);
    }
    this.entradas = [];
    this.persistir();
  }

  private aUltima(e: EntradaJournal): UltimaOperacion {
    return {
      id: e.id,
      tipo: e.tipo,
      repoPath: e.repoPath,
      descripcion: e.descripcion,
      puedeDeshacer: e.puedeDeshacer,
      motivoBloqueo: e.motivoBloqueo,
      comandoGit: e.comandoGit,
      estadoAnterior: e.estadoAnterior,
      timestamp: e.timestamp,
    };
  }

  private publica(e: EntradaJournal, esPunta: boolean): EntradaJournalPublica {
    const motivo = !e.deshecha && !esPunta && e.puedeDeshacer
      ? 'Deshace primero las operaciones posteriores'
      : e.motivoBloqueo;
    const puede = esPunta && e.puedeDeshacer && !e.deshecha;
    return {
      id: e.id,
      tipo: e.tipo,
      descripcion: e.descripcion,
      puedeDeshacer: puede,
      motivoBloqueo: puede ? undefined : motivo || 'Esta operación no se puede deshacer',
      comandoGit: e.comandoGit ?? comandoGitDeOperacion(e.tipo, e.payload),
      estadoAnterior:
        e.estadoAnterior ?? estadoAnteriorDeOperacion(e.tipo, e.payload),
      timestamp: e.timestamp,
      deshecha: e.deshecha,
      esPunta,
      archivosSnapshot: contarArchivosSnapshot(e.snapshotId, this.dirBase),
    };
  }
}

export const journalOperaciones = new JournalOperaciones();

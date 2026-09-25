// Austria: Casos de Uso de la Capa de Aplicacion DDD para Git
import path from 'path';
import { IGitRepository } from '../../domain/repositories/IGitRepository.js';
import { ICommandLogRepository } from '../../domain/repositories/ICommandLogRepository.js';
import {
  CommitEntity,
  BranchEntity,
  RemoteEntity,
  TagEntity,
  StashEntity,
  RepositoryStatusEntity,
  RepositorySummaryEntity,
  ConflictEntity,
  BranchComparisonEntity,
  CommandLogEntity,
  InfoAmendEntity,
  EntradaReflogEntity,
  PreviewOperacionEntity,
  TipoOperacionPreview,
  ArchivoCambioEntity,
  OpcionesDiff,
} from '../../domain/entities/GitEntities.js';
import {
  JournalOperaciones,
  journalOperaciones,
} from '../deshacer/JournalOperaciones.js';
import type { EntradaJournalPublica, UltimaOperacion } from '../deshacer/tiposJournal.js';
import { registroOperaciones } from '../operaciones/RegistroOperaciones.js';
import {
  gestorOperaciones,
  mapearTipoLock,
  OperationManager,
  type RegistroOperacion,
} from '../operaciones/OperationManager.js';
import { vistaOperacion, type VistaOperacion } from '../operaciones/operacionesAsincronas.js';
import {
  borrarSnapshot,
  crearSnapshotArchivos,
  restaurarSnapshot,
} from '../../infrastructure/deshacer/SnapshotArchivos.js';
import {
  validarRutaArchivoEnRepositorio,
  validarHashGit,
  validarRefGit,
  validarUrlClone,
  validarNombreRemoto,
  validarIndiceStash,
  validarTipoReset,
  validarDestinoFetch,
  validarDestinoPush,
  sanitizarRemotoParaMostrar,
} from '../../infrastructure/seguridad/validarRutaRepositorio.js';
import type { EscuchaProgresoGit, GitOperacion, TipoGitOperacion } from '../../domain/entities/GitOperacion.js';

export class GitUseCases {
  constructor(
    private gitRepository: IGitRepository,
    private logRepository: ICommandLogRepository,
    private journal: JournalOperaciones = journalOperaciones,
    private gestor: OperationManager = gestorOperaciones
  ) {}

  private async ejecutarExclusiva<T>(
    repoPath: string,
    tipo: TipoGitOperacion,
    trabajo: (onProgreso: EscuchaProgresoGit) => Promise<T>
  ): Promise<T> {
    const { resultado } = await this.gestor.ejecutar({
      repository: repoPath,
      type: mapearTipoLock(tipo),
      trabajo,
    });
    return resultado;
  }

  listarOperaciones(): GitOperacion[] {
    return registroOperaciones.listar();
  }

  obtenerOperacion(operationId: string): VistaOperacion | undefined {
    const op = this.gestor.obtener(operationId);
    return op ? vistaOperacion(op) : undefined;
  }

  private asegurarUrlsDeRemotos(remotos: RemoteEntity[]): void {
    for (const remoto of remotos) {
      if (remoto.fetchUrl) validarDestinoFetch(remoto.fetchUrl);
      if (remoto.pushUrl) validarDestinoPush(remoto.pushUrl);
    }
  }

  async listRepositories(rootPath: string): Promise<RepositorySummaryEntity[]> {
    return await this.gitRepository.listRepositories(rootPath);
  }

  async getRepositoryStatus(repoPath: string): Promise<RepositoryStatusEntity> {
    return await this.gitRepository.getStatus(repoPath);
  }

  async getCommitGraph(repoPath: string, limit = 800): Promise<CommitEntity[]> {
    return await this.gitRepository.getCommits(repoPath, limit);
  }

  async getBranches(repoPath: string): Promise<BranchEntity[]> {
    return await this.gitRepository.getBranches(repoPath);
  }

  async getDiff(repoPath: string, filePath?: string, staged = false, opciones?: OpcionesDiff): Promise<string> {
    const commit = opciones?.commit ? validarHashGit(opciones.commit) : undefined;
    const desde = opciones?.desde ? validarRefGit(opciones.desde) : undefined;
    const hasta = opciones?.hasta ? validarRefGit(opciones.hasta) : undefined;
    return await this.gitRepository.getDiff(repoPath, filePath, staged, { commit, desde, hasta });
  }

  async listarArchivosCommit(repoPath: string, hash: string): Promise<ArchivoCambioEntity[]> {
    return await this.gitRepository.listarArchivosCommit(repoPath, validarHashGit(hash));
  }

  async listarArchivosEntreRefs(repoPath: string, base: string, target: string): Promise<ArchivoCambioEntity[]> {
    return await this.gitRepository.listarArchivosEntreRefs(repoPath, validarRefGit(base), validarRefGit(target));
  }

  async stage(repoPath: string, filePath?: string, all = false): Promise<void> {
    if (all) {
      await this.gitRepository.stageAll(repoPath);
    } else if (filePath) {
      await this.gitRepository.stageFile(repoPath, filePath);
    }
  }

  async unstage(repoPath: string, filePath: string): Promise<void> {
    await this.gitRepository.unstageFile(repoPath, filePath);
  }

  async commit(repoPath: string, message: string, description?: string): Promise<string> {
    const hashAnterior = await this.gitRepository.obtenerHashHead(repoPath);
    const hash = await this.gitRepository.commit(repoPath, message, description);
    this.journal.registrar({
      tipo: 'commit',
      repoPath,
      descripcion: `Commit ${hash.substring(0, 7)}`,
      puedeDeshacer: true,
      payload: { hashAnterior, hashNuevo: hash },
    });
    return hash;
  }

  async checkout(repoPath: string, target: string): Promise<void> {
    const destino = validarRefGit(target);
    return this.ejecutarExclusiva(repoPath, 'checkout', async () => {
      const status = await this.gitRepository.getStatus(repoPath);
      const anterior = status.currentBranch;
      await this.gitRepository.checkout(repoPath, destino);
      this.journal.registrar({
        tipo: 'checkout',
        repoPath,
        descripcion: `Checkout a ${destino}`,
        puedeDeshacer: Boolean(anterior) && anterior !== 'HEAD desvinculado',
        motivoBloqueo: anterior ? undefined : 'No hay rama previa para volver',
        payload: { anterior, destino },
      });
    });
  }

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    const rama = validarRefGit(branchName);
    const origen = startPoint ? validarRefGit(startPoint) : undefined;
    const status = await this.gitRepository.getStatus(repoPath);
    await this.gitRepository.createBranch(repoPath, rama, origen);
    this.journal.registrar({
      tipo: 'crearRama',
      repoPath,
      descripcion: `Rama ${rama} creada`,
      puedeDeshacer: true,
      payload: { rama, anterior: status.currentBranch },
    });
  }

  async deleteLocalBranch(repoPath: string, branchName: string): Promise<void> {
    const rama = validarRefGit(branchName);
    return this.ejecutarExclusiva(repoPath, 'borrarRama', async () => {
      const ramas = await this.gitRepository.getBranches(repoPath);
      const encontrada = ramas.find((r) => r.name === rama);
      await this.gitRepository.deleteLocalBranch(repoPath, rama);
      this.journal.registrar({
        tipo: 'borrarRama',
        repoPath,
        descripcion: `Rama ${rama} borrada`,
        puedeDeshacer: Boolean(encontrada?.commit),
        motivoBloqueo: encontrada?.commit ? undefined : 'No se conservó el hash de la rama',
        payload: { rama, hash: encontrada?.commit ?? '' },
      });
    });
  }

  async renameLocalBranch(repoPath: string, nombreActual: string, nombreNuevo: string): Promise<void> {
    const actual = validarRefGit(nombreActual);
    const nuevo = validarRefGit(nombreNuevo);
    await this.gitRepository.renameLocalBranch(repoPath, actual, nuevo);
    this.journal.registrar({
      tipo: 'renombrarRama',
      repoPath,
      descripcion: `Rama ${actual} → ${nuevo}`,
      puedeDeshacer: true,
      payload: { nombreActual: actual, nombreNuevo: nuevo },
    });
  }

  async pull(repoPath: string, modo: 'merge' | 'rebase' = 'merge'): Promise<void> {
    const tipo = this.tipoPull(modo);
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return this.ejecutarExclusiva(repoPath, tipo, (onProgreso) => this.trabajoPull(repoPath, modo, onProgreso));
  }

  async programarPull(repoPath: string, modo: 'merge' | 'rebase' = 'merge'): Promise<VistaOperacion> {
    const tipo = this.tipoPull(modo);
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return vistaOperacion(
      this.gestor.iniciar({
        repository: repoPath,
        type: mapearTipoLock(tipo),
        trabajo: (onProgreso) => this.trabajoPull(repoPath, modo, onProgreso),
      })
    );
  }

  async push(repoPath: string): Promise<void> {
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return this.ejecutarExclusiva(repoPath, 'push', (onProgreso) => this.trabajoPush(repoPath, onProgreso));
  }

  async programarPush(repoPath: string): Promise<VistaOperacion> {
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return vistaOperacion(
      this.gestor.iniciar({
        repository: repoPath,
        type: 'push',
        trabajo: (onProgreso) => this.trabajoPush(repoPath, onProgreso),
      })
    );
  }

  private tipoPull(modo: 'merge' | 'rebase'): TipoGitOperacion {
    return modo === 'rebase' ? 'rebase' : 'pull';
  }

  private async trabajoPull(
    repoPath: string,
    modo: 'merge' | 'rebase',
    onProgreso: EscuchaProgresoGit
  ): Promise<void> {
    await this.gitRepository.pull(repoPath, modo, onProgreso);
    this.journal.registrar({
      tipo: 'pull',
      repoPath,
      descripcion: `Pull (${modo})`,
      puedeDeshacer: false,
      motivoBloqueo: 'Un pull no se deshace en un paso seguro; usa reflog si hace falta.',
      payload: { modo },
    });
  }

  private async trabajoPush(repoPath: string, onProgreso: EscuchaProgresoGit): Promise<void> {
    await this.gitRepository.push(repoPath, onProgreso);
    this.journal.marcarNoDeshacer('Un push ya está en el remoto; no se deshace desde Abyssan.');
    this.journal.registrar({
      tipo: 'push',
      repoPath,
      descripcion: 'Push al remoto',
      puedeDeshacer: false,
      motivoBloqueo: 'Un push ya está en el remoto; no se deshace desde Abyssan.',
      payload: {},
    });
  }

  async discardArchivo(repoPath: string, filePath: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'discard', async () => {
      const archivo = validarRutaArchivoEnRepositorio(repoPath, filePath);
      const snap = crearSnapshotArchivos(repoPath, [archivo], this.journal.directorioPersistencia());
      const existia = snap.manifest.archivos.length > 0;
      if (!existia) borrarSnapshot(snap.id, this.journal.directorioPersistencia());
      await this.gitRepository.discardArchivo(repoPath, archivo);
      this.journal.registrar({
        tipo: 'discard',
        repoPath,
        descripcion: `Descartado ${archivo}`,
        puedeDeshacer: existia,
        motivoBloqueo: existia
          ? undefined
          : snap.manifest.omitidos[0]?.motivo ?? 'El archivo no tenía contenido que restaurar',
        payload: { filePath: archivo, existia: existia ? '1' : '0' },
        snapshotId: existia ? snap.id : undefined,
      });
    });
  }

  async clonarRepositorio(url: string, destino: string): Promise<void> {
    const urlValida = validarUrlClone(url);
    return this.ejecutarExclusiva(destino, 'clone', (onProgreso) => this.trabajoClone(urlValida, destino, onProgreso));
  }

  async programarClon(url: string, destino: string): Promise<VistaOperacion> {
    const urlValida = validarUrlClone(url);
    return vistaOperacion(
      this.gestor.iniciar({
        repository: destino,
        type: 'clone',
        trabajo: (onProgreso) => this.trabajoClone(urlValida, destino, onProgreso),
      })
    );
  }

  private async trabajoClone(url: string, destino: string, onProgreso: EscuchaProgresoGit): Promise<void> {
    await this.gitRepository.clonarRepositorio(url, destino, onProgreso);
    this.journal.registrar({
      tipo: 'clone',
      repoPath: destino,
      descripcion: `Clonado en ${path.basename(destino)}`,
      puedeDeshacer: false,
      motivoBloqueo: 'El clonado no se deshace: borra la carpeta a mano si no la quieres.',
      payload: { destino },
    });
  }

  async inicializarRepositorio(destino: string): Promise<void> {
    return this.ejecutarExclusiva(destino, 'init', async () => {
      await this.gitRepository.inicializarRepositorio(destino);
      this.journal.registrar({
        tipo: 'init',
        repoPath: destino,
        descripcion: `Init en ${path.basename(destino)}`,
        puedeDeshacer: false,
        motivoBloqueo: 'Init no se deshace desde Abyssan.',
        payload: { destino },
      });
    });
  }

  async abortarMerge(repoPath: string): Promise<void> {
    await this.gitRepository.abortarMerge(repoPath);
    this.journal.registrar({
      tipo: 'merge',
      repoPath,
      descripcion: 'Merge abortado',
      puedeDeshacer: false,
      motivoBloqueo: 'Abortar el merge ya restauró el estado previo.',
      payload: {},
    });
  }

  async continuarMerge(repoPath: string): Promise<void> {
    await this.gitRepository.continuarMerge(repoPath);
    this.journal.registrar({
      tipo: 'commit',
      repoPath,
      descripcion: 'Merge continuado',
      puedeDeshacer: false,
      motivoBloqueo: 'El merge ya se materializó en un commit.',
      payload: {},
    });
  }

  async obtenerInfoAmend(repoPath: string): Promise<InfoAmendEntity> {
    return this.gitRepository.obtenerInfoAmend(repoPath);
  }

  async enmendarCommit(repoPath: string, message: string, confirmarRemoto = false): Promise<string> {
    const info = await this.gitRepository.obtenerInfoAmend(repoPath);
    if (!info.esNuestro) {
      throw new Error('Solo puedes enmendar un commit propio (mismo user.email)');
    }
    if (info.estaEnRemoto && !confirmarRemoto) {
      throw new Error('El commit ya está en el remoto; confirma para enmendar');
    }
    const hash = await this.ejecutarExclusiva(repoPath, 'amend', async () => {
      return this.gitRepository.enmendarCommit(repoPath, message);
    });
    this.journal.registrar({
      tipo: 'amend',
      repoPath,
      descripcion: 'Commit enmendado',
      puedeDeshacer: false,
      motivoBloqueo: 'Amend reescribe historia; usa reflog si necesitas el mensaje anterior.',
      payload: { hash },
    });
    return hash;
  }

  async obtenerReflog(repoPath: string, limite = 20): Promise<EntradaReflogEntity[]> {
    return this.gitRepository.obtenerReflog(repoPath, limite);
  }

  listarJournal(repoPath: string): EntradaJournalPublica[] {
    return this.journal.listar(repoPath);
  }

  obtenerUltimaOperacion(repoPath?: string): UltimaOperacion | { puedeDeshacer: false; motivoBloqueo: string } {
    const op = this.journal.obtener(repoPath);
    if (!op) {
      return { puedeDeshacer: false, motivoBloqueo: 'No hay operación reciente para deshacer' };
    }
    return op;
  }

  async deshacer(repoPath: string, id?: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'deshacer', async () => {
      const punta = this.journal.punta(repoPath);
      if (!punta) {
        throw new Error('No hay operación reciente para deshacer');
      }
      if (id) {
        if (!/^[a-f0-9]{16}$/.test(id)) {
          throw new Error('Identificador de journal no válido');
        }
        if (id !== punta.id) {
          throw new Error('Solo se puede deshacer la operación más reciente que no se haya deshecho');
        }
      }
      if (!punta.puedeDeshacer) {
        throw new Error(punta.motivoBloqueo || 'Esta operación no se puede deshacer');
      }

      const op = punta;
      switch (op.tipo) {
        case 'crearRama': {
          const actual = await this.gitRepository.getStatus(repoPath);
          const rama = validarRefGit(op.payload.rama);
          if (actual.currentBranch === rama && op.payload.anterior) {
            await this.gitRepository.checkout(repoPath, validarRefGit(op.payload.anterior));
          }
          await this.gitRepository.deleteLocalBranch(repoPath, rama);
          break;
        }
        case 'borrarRama':
          await this.gitRepository.recrearRama(
            repoPath,
            validarRefGit(op.payload.rama),
            validarHashGit(op.payload.hash)
          );
          break;
        case 'renombrarRama':
          await this.gitRepository.renameLocalBranch(
            repoPath,
            validarRefGit(op.payload.nombreNuevo),
            validarRefGit(op.payload.nombreActual)
          );
          break;
        case 'commit':
          if (op.payload.hashAnterior) {
            await this.gitRepository.reset(repoPath, 'soft', validarHashGit(op.payload.hashAnterior));
          } else {
            throw new Error('No hay commit anterior al que volver');
          }
          break;
        case 'reset':
          await this.gitRepository.reset(repoPath, 'hard', validarHashGit(op.payload.hashAnterior));
          if (op.snapshotId) {
            restaurarSnapshot(op.snapshotId, repoPath, this.journal.directorioPersistencia());
          }
          break;
        case 'discard':
          if (op.snapshotId) {
            restaurarSnapshot(op.snapshotId, repoPath, this.journal.directorioPersistencia());
          } else {
            throw new Error('No hay snapshot para restaurar el archivo');
          }
          break;
        case 'checkout':
          await this.gitRepository.checkout(repoPath, validarRefGit(op.payload.anterior));
          break;
        default:
          throw new Error('Esta operación no se puede deshacer');
      }

      this.journal.marcarDeshecha(op.id);
    });
  }

  // Remotos
  async getRemotes(repoPath: string): Promise<RemoteEntity[]> {
    const remotos = await this.gitRepository.getRemotes(repoPath);
    return remotos.map((remoto) => ({
      ...remoto,
      fetchUrl: sanitizarRemotoParaMostrar(remoto.fetchUrl),
      pushUrl: sanitizarRemotoParaMostrar(remoto.pushUrl),
    }));
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    const nombre = validarNombreRemoto(name);
    const urlValida = validarUrlClone(url);
    await this.gitRepository.addRemote(repoPath, nombre, urlValida);
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
    await this.gitRepository.removeRemote(repoPath, validarNombreRemoto(name));
  }

  async fetchAll(repoPath: string, prune = true): Promise<void> {
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return this.ejecutarExclusiva(repoPath, 'fetch', (onProgreso) =>
      this.gitRepository.fetchAll(repoPath, prune, onProgreso)
    );
  }

  async programarFetch(repoPath: string, prune = true): Promise<VistaOperacion> {
    this.asegurarUrlsDeRemotos(await this.gitRepository.getRemotes(repoPath));
    return vistaOperacion(
      this.gestor.iniciar({
        repository: repoPath,
        type: 'fetch',
        trabajo: (onProgreso) => this.gitRepository.fetchAll(repoPath, prune, onProgreso),
      })
    );
  }

  async compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<BranchComparisonEntity> {
    return await this.gitRepository.compareBranches(
      repoPath,
      validarRefGit(baseBranch),
      validarRefGit(targetBranch)
    );
  }

  async merge(repoPath: string, sourceBranch: string, noFf = false): Promise<RegistroOperacion> {
    const origen = validarRefGit(sourceBranch);
    const { operacion } = await this.gestor.ejecutar({
      repository: repoPath,
      type: 'merge',
      metadata: { sourceBranch: origen, noFf },
      trabajo: async () => {
        await this.gitRepository.mergeBranch(repoPath, origen, noFf);
        this.journal.registrar({
          tipo: 'merge',
          repoPath,
          descripcion: `Merge de ${origen}`,
          puedeDeshacer: false,
          motivoBloqueo: 'Un merge se aborta con “Abortar merge”, no con Deshacer.',
          payload: { sourceBranch: origen },
        });
      },
    });
    return operacion;
  }

  async getStashes(repoPath: string): Promise<StashEntity[]> {
    return await this.gitRepository.getStashes(repoPath);
  }

  async saveStash(repoPath: string, message?: string): Promise<void> {
    await this.gitRepository.saveStash(repoPath, message);
  }

  async popStash(repoPath: string, index = 0): Promise<void> {
    const indice = validarIndiceStash(index);
    return this.ejecutarExclusiva(repoPath, 'stash', async () => {
      await this.gitRepository.popStash(repoPath, indice);
    });
  }

  async dropStash(repoPath: string, index = 0): Promise<void> {
    await this.gitRepository.dropStash(repoPath, validarIndiceStash(index));
  }

  async getTags(repoPath: string): Promise<TagEntity[]> {
    return await this.gitRepository.getTags(repoPath);
  }

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    const nombre = validarRefGit(tagName);
    const hash = targetHash ? validarHashGit(targetHash) : undefined;
    await this.gitRepository.createTag(repoPath, nombre, hash);
  }

  async cherryPick(repoPath: string, hash: string): Promise<void> {
    const commit = validarHashGit(hash);
    return this.ejecutarExclusiva(repoPath, 'cherry-pick', async () => {
      await this.gitRepository.cherryPick(repoPath, commit);
      this.journal.registrar({
        tipo: 'cherry-pick',
        repoPath,
        descripcion: `Cherry-pick ${commit.substring(0, 7)}`,
        puedeDeshacer: false,
        motivoBloqueo: 'Un cherry-pick no se deshace en un paso seguro; usa reflog si hace falta.',
        payload: { hash: commit },
      });
    });
  }

  async revert(repoPath: string, hash: string): Promise<void> {
    const commit = validarHashGit(hash);
    return this.ejecutarExclusiva(repoPath, 'revert', async () => {
      await this.gitRepository.revertCommit(repoPath, commit);
      this.journal.registrar({
        tipo: 'revert',
        repoPath,
        descripcion: `Revert ${commit.substring(0, 7)}`,
        puedeDeshacer: false,
        motivoBloqueo: 'Un revert no se deshace en un paso seguro; usa reflog si hace falta.',
        payload: { hash: commit },
      });
    });
  }

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    const tipo = validarTipoReset(type);
    const destino = validarRefGit(target);
    return this.ejecutarExclusiva(repoPath, 'reset', async () => {
      const hashAnterior = await this.gitRepository.obtenerHashHead(repoPath);
      let snapshotId: string | undefined;
      if (tipo === 'hard') {
        const status = await this.gitRepository.getStatus(repoPath);
        const sucios = status.files.filter((f) => f.status !== 'deleted').map((f) => f.path);
        if (sucios.length > 0) {
          const snap = crearSnapshotArchivos(repoPath, sucios, this.journal.directorioPersistencia());
          snapshotId = snap.manifest.archivos.length > 0 ? snap.id : undefined;
        }
      }
      await this.gitRepository.reset(repoPath, tipo, destino);
      this.journal.registrar({
        tipo: 'reset',
        repoPath,
        descripcion: `Reset --${tipo} a ${destino.substring(0, 7)}`,
        puedeDeshacer: Boolean(hashAnterior),
        motivoBloqueo: hashAnterior ? undefined : 'No se conservó HEAD previo',
        payload: { hashAnterior, type: tipo, target: destino },
        snapshotId,
      });
    });
  }

  async getConflict(repoPath: string, filePath: string): Promise<ConflictEntity> {
    return await this.gitRepository.getConflictDetails(repoPath, filePath);
  }

  async resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void> {
    await this.gitRepository.resolveConflict(repoPath, filePath, resolvedContent);
  }

  // --- Identidad del autor git ---

  async obtenerIdentidad(repoPath: string): Promise<{ nombre: string; correo: string; alcance: 'local' | 'global' }> {
    return this.gitRepository.obtenerIdentidad(repoPath);
  }

  async configurarIdentidad(repoPath: string, nombre: string, correo: string, global: boolean): Promise<void> {
    return this.gitRepository.configurarIdentidad(repoPath, nombre, correo, global);
  }

  // --- Merge-base ---

  async mergeBase(repoPath: string, refA: string, refB: string): Promise<string | null> {
    return this.gitRepository.mergeBase(repoPath, validarRefGit(refA), validarRefGit(refB));
  }

  // --- Preview de operaciones peligrosas (no mutante) ---

  async previewOperacion(
    repoPath: string,
    operacion: TipoOperacionPreview,
    params: { sourceBranch?: string; type?: 'soft' | 'mixed' | 'hard'; target?: string; hash?: string }
  ): Promise<PreviewOperacionEntity> {
    switch (operacion) {
      case 'merge': {
        if (!params.sourceBranch) throw new Error('sourceBranch es requerido para preview de merge');
        return this.gitRepository.previewMerge(repoPath, validarRefGit(params.sourceBranch));
      }
      case 'reset': {
        if (!params.type || !params.target) throw new Error('type y target son requeridos para preview de reset');
        return this.gitRepository.previewReset(repoPath, validarTipoReset(params.type), validarRefGit(params.target));
      }
      case 'cherry-pick': {
        if (!params.hash) throw new Error('hash es requerido para preview de cherry-pick');
        return this.gitRepository.previewCherryPick(repoPath, validarHashGit(params.hash));
      }
      case 'revert': {
        if (!params.hash) throw new Error('hash es requerido para preview de revert');
        return this.gitRepository.previewRevert(repoPath, validarHashGit(params.hash));
      }
      default:
        throw new Error(`Operación de preview no soportada: ${operacion}`);
    }
  }

  getAuditLogs(): CommandLogEntity[] {
    return this.logRepository.getRecentLogs();
  }
}

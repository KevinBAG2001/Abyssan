// Austria: Casos de Uso de la Capa de Aplicacion DDD para Git
import fs from 'fs';
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
} from '../../domain/entities/GitEntities.js';
import {
  registroUltimaOperacion,
  UltimaOperacion,
} from '../deshacer/RegistroUltimaOperacion.js';
import { colaOperaciones } from '../operaciones/ColaOperaciones.js';
import { registroOperaciones } from '../operaciones/RegistroOperaciones.js';
import { sanitizarTextoAuditoria } from '../../infrastructure/auditoria/AuditoriaJsonlAdapter.js';
import type { EscuchaProgresoGit, GitOperacion, TipoGitOperacion } from '../../domain/entities/GitOperacion.js';

export class GitUseCases {
  constructor(
    private gitRepository: IGitRepository,
    private logRepository: ICommandLogRepository
  ) {}

  private async ejecutarExclusiva<T>(
    repoPath: string,
    tipo: TipoGitOperacion,
    trabajo: (onProgreso: EscuchaProgresoGit) => Promise<T>
  ): Promise<T> {
    const op = registroOperaciones.crear(tipo, repoPath);
    return colaOperaciones.encolar(repoPath, async () => {
      registroOperaciones.marcarCorriendo(op.id);
      const onProgreso: EscuchaProgresoGit = (informe) => {
        registroOperaciones.actualizarProgreso(op.id, informe.porcentaje, informe.etapa);
      };
      try {
        const resultado = await trabajo(onProgreso);
        registroOperaciones.completar(op.id, 'exito');
        return resultado;
      } catch (error) {
        const mensaje = sanitizarTextoAuditoria(
          error instanceof Error ? error.message : String(error)
        );
        registroOperaciones.completar(op.id, 'fallo', mensaje);
        throw error;
      }
    });
  }

  listarOperaciones(): GitOperacion[] {
    return registroOperaciones.listar();
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

  async getDiff(repoPath: string, filePath?: string, staged = false): Promise<string> {
    return await this.gitRepository.getDiff(repoPath, filePath, staged);
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
    const grafo = await this.gitRepository.getCommits(repoPath, 1);
    const hashAnterior = grafo[0]?.hash ?? '';
    const hash = await this.gitRepository.commit(repoPath, message, description);
    registroUltimaOperacion.registrar({
      tipo: 'commit',
      repoPath,
      descripcion: `Commit ${hash.substring(0, 7)}`,
      puedeDeshacer: true,
      payload: { hashAnterior, hashNuevo: hash },
    });
    return hash;
  }

  async checkout(repoPath: string, target: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'checkout', async () => {
      const status = await this.gitRepository.getStatus(repoPath);
      const anterior = status.currentBranch;
      await this.gitRepository.checkout(repoPath, target);
      registroUltimaOperacion.registrar({
        tipo: 'checkout',
        repoPath,
        descripcion: `Checkout a ${target}`,
        puedeDeshacer: Boolean(anterior) && anterior !== 'HEAD desvinculado',
        motivoBloqueo: anterior ? undefined : 'No hay rama previa para volver',
        payload: { anterior, destino: target },
      });
    });
  }

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    const status = await this.gitRepository.getStatus(repoPath);
    await this.gitRepository.createBranch(repoPath, branchName, startPoint);
    registroUltimaOperacion.registrar({
      tipo: 'crearRama',
      repoPath,
      descripcion: `Rama ${branchName} creada`,
      puedeDeshacer: true,
      payload: { rama: branchName, anterior: status.currentBranch },
    });
  }

  async deleteLocalBranch(repoPath: string, branchName: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'borrarRama', async () => {
      const ramas = await this.gitRepository.getBranches(repoPath);
      const rama = ramas.find((r) => r.name === branchName);
      await this.gitRepository.deleteLocalBranch(repoPath, branchName);
      registroUltimaOperacion.registrar({
        tipo: 'borrarRama',
        repoPath,
        descripcion: `Rama ${branchName} borrada`,
        puedeDeshacer: Boolean(rama?.commit),
        motivoBloqueo: rama?.commit ? undefined : 'No se conservó el hash de la rama',
        payload: { rama: branchName, hash: rama?.commit ?? '' },
      });
    });
  }

  async renameLocalBranch(repoPath: string, nombreActual: string, nombreNuevo: string): Promise<void> {
    await this.gitRepository.renameLocalBranch(repoPath, nombreActual, nombreNuevo);
    registroUltimaOperacion.registrar({
      tipo: 'renombrarRama',
      repoPath,
      descripcion: `Rama ${nombreActual} → ${nombreNuevo}`,
      puedeDeshacer: true,
      payload: { nombreActual, nombreNuevo },
    });
  }

  async pull(repoPath: string, modo: 'merge' | 'rebase' = 'merge'): Promise<void> {
    const tipo: TipoGitOperacion = modo === 'rebase' ? 'rebase' : 'pull';
    return this.ejecutarExclusiva(repoPath, tipo, async (onProgreso) => {
      await this.gitRepository.pull(repoPath, modo, onProgreso);
      registroUltimaOperacion.registrar({
        tipo: 'merge',
        repoPath,
        descripcion: `Pull (${modo})`,
        puedeDeshacer: false,
        motivoBloqueo: 'Un pull no se deshace en un paso seguro; usa reflog si hace falta.',
        payload: { modo },
      });
    });
  }

  async push(repoPath: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'push', async (onProgreso) => {
      await this.gitRepository.push(repoPath, onProgreso);
      registroUltimaOperacion.marcarNoDeshacer('Un push ya está en el remoto; no se deshace desde Abyssan.');
    });
  }

  async discardArchivo(repoPath: string, filePath: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'discard', async () => {
      const full = path.join(repoPath, filePath);
      let contenido = '';
      const existia = fs.existsSync(full) && fs.statSync(full).isFile();
      if (existia) {
        contenido = fs.readFileSync(full, 'utf8');
      }
      await this.gitRepository.discardArchivo(repoPath, filePath);
      registroUltimaOperacion.registrar({
        tipo: 'discard',
        repoPath,
        descripcion: `Descartado ${filePath}`,
        puedeDeshacer: existia,
        motivoBloqueo: existia ? undefined : 'El archivo no tenía contenido que restaurar',
        payload: { filePath, contenido, existia: existia ? '1' : '0' },
      });
    });
  }

  async clonarRepositorio(url: string, destino: string): Promise<void> {
    return this.ejecutarExclusiva(destino, 'clone', async (onProgreso) => {
      await this.gitRepository.clonarRepositorio(url, destino, onProgreso);
      registroUltimaOperacion.registrar({
        tipo: 'clone',
        repoPath: destino,
        descripcion: `Clonado en ${path.basename(destino)}`,
        puedeDeshacer: false,
        motivoBloqueo: 'El clonado no se deshace: borra la carpeta a mano si no la quieres.',
        payload: { destino },
      });
    });
  }

  async inicializarRepositorio(destino: string): Promise<void> {
    return this.ejecutarExclusiva(destino, 'init', async () => {
      await this.gitRepository.inicializarRepositorio(destino);
      registroUltimaOperacion.registrar({
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
    registroUltimaOperacion.registrar({
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
    registroUltimaOperacion.registrar({
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
    registroUltimaOperacion.registrar({
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

  obtenerUltimaOperacion(repoPath?: string): UltimaOperacion | { puedeDeshacer: false; motivoBloqueo: string } {
    const op = registroUltimaOperacion.obtener(repoPath);
    if (!op) {
      return { puedeDeshacer: false, motivoBloqueo: 'No hay operación reciente para deshacer' };
    }
    return op;
  }

  async deshacer(repoPath: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'deshacer', async () => {
      const op = registroUltimaOperacion.obtener(repoPath);
      if (!op) {
        throw new Error('No hay operación reciente para deshacer');
      }
      if (!op.puedeDeshacer) {
        throw new Error(op.motivoBloqueo || 'Esta operación no se puede deshacer');
      }

      switch (op.tipo) {
        case 'crearRama': {
          const actual = await this.gitRepository.getStatus(repoPath);
          if (actual.currentBranch === op.payload.rama && op.payload.anterior) {
            await this.gitRepository.checkout(repoPath, op.payload.anterior);
          }
          await this.gitRepository.deleteLocalBranch(repoPath, op.payload.rama);
          break;
        }
        case 'borrarRama':
          await this.gitRepository.recrearRama(repoPath, op.payload.rama, op.payload.hash);
          break;
        case 'renombrarRama':
          await this.gitRepository.renameLocalBranch(
            repoPath,
            op.payload.nombreNuevo,
            op.payload.nombreActual
          );
          break;
        case 'commit':
          if (op.payload.hashAnterior) {
            await this.gitRepository.reset(repoPath, 'soft', op.payload.hashAnterior);
          } else {
            throw new Error('No hay commit anterior al que volver');
          }
          break;
        case 'reset':
          await this.gitRepository.reset(repoPath, 'hard', op.payload.hashAnterior);
          break;
        case 'discard':
          if (op.payload.existia === '1') {
            await this.gitRepository.escribirArchivoRelativo(
              repoPath,
              op.payload.filePath,
              op.payload.contenido
            );
          }
          break;
        case 'checkout':
          await this.gitRepository.checkout(repoPath, op.payload.anterior);
          break;
        default:
          throw new Error('Esta operación no se puede deshacer');
      }

      registroUltimaOperacion.limpiar();
    });
  }

  // Remotos
  async getRemotes(repoPath: string): Promise<RemoteEntity[]> {
    return await this.gitRepository.getRemotes(repoPath);
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    await this.gitRepository.addRemote(repoPath, name, url);
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
    await this.gitRepository.removeRemote(repoPath, name);
  }

  async fetchAll(repoPath: string, prune = true): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'fetch', async (onProgreso) => {
      await this.gitRepository.fetchAll(repoPath, prune, onProgreso);
    });
  }

  async compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<BranchComparisonEntity> {
    return await this.gitRepository.compareBranches(repoPath, baseBranch, targetBranch);
  }

  async merge(repoPath: string, sourceBranch: string, noFf = false): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'merge', async () => {
      await this.gitRepository.mergeBranch(repoPath, sourceBranch, noFf);
      registroUltimaOperacion.registrar({
        tipo: 'merge',
        repoPath,
        descripcion: `Merge de ${sourceBranch}`,
        puedeDeshacer: false,
        motivoBloqueo: 'Un merge se aborta con “Abortar merge”, no con Deshacer.',
        payload: { sourceBranch },
      });
    });
  }

  async getStashes(repoPath: string): Promise<StashEntity[]> {
    return await this.gitRepository.getStashes(repoPath);
  }

  async saveStash(repoPath: string, message?: string): Promise<void> {
    await this.gitRepository.saveStash(repoPath, message);
  }

  async popStash(repoPath: string, index = 0): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'stash', async () => {
      await this.gitRepository.popStash(repoPath, index);
    });
  }

  async dropStash(repoPath: string, index = 0): Promise<void> {
    await this.gitRepository.dropStash(repoPath, index);
  }

  async getTags(repoPath: string): Promise<TagEntity[]> {
    return await this.gitRepository.getTags(repoPath);
  }

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    await this.gitRepository.createTag(repoPath, tagName, targetHash);
  }

  async cherryPick(repoPath: string, hash: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'cherry-pick', async () => {
      await this.gitRepository.cherryPick(repoPath, hash);
    });
  }

  async revert(repoPath: string, hash: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'revert', async () => {
      await this.gitRepository.revertCommit(repoPath, hash);
    });
  }

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    return this.ejecutarExclusiva(repoPath, 'reset', async () => {
      const grafo = await this.gitRepository.getCommits(repoPath, 1);
      const hashAnterior = grafo[0]?.hash ?? '';
      await this.gitRepository.reset(repoPath, type, target);
      registroUltimaOperacion.registrar({
        tipo: 'reset',
        repoPath,
        descripcion: `Reset --${type} a ${target.substring(0, 7)}`,
        puedeDeshacer: Boolean(hashAnterior),
        motivoBloqueo: hashAnterior ? undefined : 'No se conservó HEAD previo',
        payload: { hashAnterior, type, target },
      });
    });
  }

  async getConflict(repoPath: string, filePath: string): Promise<ConflictEntity> {
    return await this.gitRepository.getConflictDetails(repoPath, filePath);
  }

  async resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void> {
    await this.gitRepository.resolveConflict(repoPath, filePath, resolvedContent);
  }

  getAuditLogs(): CommandLogEntity[] {
    return this.logRepository.getRecentLogs();
  }
}

// Austria: Contratos de Repositorio del Dominio Git (DDD Ports)
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
  InfoAmendEntity,
  EntradaReflogEntity,
  PreviewResultado,
  ArchivoCambioEntity,
  OpcionesDiff,
} from '../entities/GitEntities.js';
import type { EscuchaProgresoGit } from '../entities/GitOperacion.js';

export interface IGitRepository {
  isGitRepository(repoPath: string): Promise<boolean>;
  listRepositories(rootPath: string): Promise<RepositorySummaryEntity[]>;
  getStatus(repoPath: string): Promise<RepositoryStatusEntity>;
  getCommits(repoPath: string, maxCount?: number): Promise<CommitEntity[]>;
  getBranches(repoPath: string): Promise<BranchEntity[]>;
  getDiff(repoPath: string, filePath?: string, staged?: boolean, opciones?: OpcionesDiff): Promise<string>;
  listarArchivosCommit(repoPath: string, hash: string): Promise<ArchivoCambioEntity[]>;
  listarArchivosEntreRefs(repoPath: string, base: string, target: string): Promise<ArchivoCambioEntity[]>;
  stageFile(repoPath: string, filePath: string): Promise<void>;
  stageAll(repoPath: string): Promise<void>;
  unstageFile(repoPath: string, filePath: string): Promise<void>;
  commit(repoPath: string, message: string, description?: string): Promise<string>;
  checkout(repoPath: string, target: string): Promise<void>;
  createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void>;
  deleteLocalBranch(repoPath: string, branchName: string): Promise<void>;
  renameLocalBranch(repoPath: string, nombreActual: string, nombreNuevo: string): Promise<void>;
  pull(repoPath: string, modo?: 'merge' | 'rebase', onProgreso?: EscuchaProgresoGit): Promise<void>;
  push(repoPath: string, onProgreso?: EscuchaProgresoGit): Promise<void>;
  discardArchivo(repoPath: string, filePath: string): Promise<void>;
  clonarRepositorio(url: string, destino: string, onProgreso?: EscuchaProgresoGit): Promise<void>;
  inicializarRepositorio(destino: string): Promise<void>;
  abortarMerge(repoPath: string): Promise<void>;
  continuarMerge(repoPath: string): Promise<void>;
  obtenerInfoAmend(repoPath: string): Promise<InfoAmendEntity>;
  enmendarCommit(repoPath: string, message: string): Promise<string>;
  obtenerReflog(repoPath: string, limite?: number): Promise<EntradaReflogEntity[]>;
  recrearRama(repoPath: string, branchName: string, hash: string): Promise<void>;
  escribirArchivoRelativo(repoPath: string, filePath: string, contenido: string): Promise<void>;
  
  // Remotos
  getRemotes(repoPath: string): Promise<RemoteEntity[]>;
  addRemote(repoPath: string, name: string, url: string): Promise<void>;
  removeRemote(repoPath: string, name: string): Promise<void>;
  fetchAll(repoPath: string, prune?: boolean, onProgreso?: EscuchaProgresoGit): Promise<void>;
  fetchRefspec(repoPath: string, remoto: string, refspec: string): Promise<void>;

  // Comparacion & Merge
  compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<BranchComparisonEntity>;
  mergeBranch(repoPath: string, sourceBranch: string, noFf?: boolean): Promise<void>;

  // Stash
  getStashes(repoPath: string): Promise<StashEntity[]>;
  saveStash(repoPath: string, message?: string): Promise<void>;
  popStash(repoPath: string, index?: number): Promise<void>;
  dropStash(repoPath: string, index?: number): Promise<void>;

  // Tags
  getTags(repoPath: string): Promise<TagEntity[]>;
  createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void>;

  // Cherry-Pick, Revert, Reset
  cherryPick(repoPath: string, hash: string): Promise<void>;
  revertCommit(repoPath: string, hash: string): Promise<void>;
  reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void>;

  // Conflictos
  getConflictDetails(repoPath: string, filePath: string): Promise<ConflictEntity>;
  resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void>;

  // Identidad del autor git
  obtenerIdentidad(repoPath: string): Promise<{ nombre: string; correo: string; alcance: 'local' | 'global' }>;
  configurarIdentidad(repoPath: string, nombre: string, correo: string, global: boolean): Promise<void>;

  // Merge-base
  mergeBase(repoPath: string, refA: string, refB: string): Promise<string | null>;

  /** Hash de HEAD (rev-parse). Vacío si el repo no tiene commits. */
  obtenerHashHead(repoPath: string): Promise<string>;

  /**
   * Ancla un commit en `refs/abyssan/recovery/<id>`.
   * La ref vive en el repositorio y evita que `git gc` recoja el objeto
   * mientras la operación siga siendo recuperable.
   */
  anclarRefRecuperacion(repoPath: string, ref: string, hash: string): Promise<void>;

  /** Resuelve la ref de recuperación al hash del commit, o null si no existe. */
  resolverRefRecuperacion(repoPath: string, ref: string): Promise<string | null>;

  /** Borra solo una ref bajo `refs/abyssan/recovery/`. No toca ramas del usuario. */
  borrarRefRecuperacion(repoPath: string, ref: string): Promise<void>;

  /** Lista refs de recuperación de este repositorio. No lista el resto de refs. */
  listarRefsRecuperacion(repoPath: string): Promise<string[]>;

  // Preview de operaciones (no mutante; merge usa sandbox)
  previewMerge(repoPath: string, sourceBranch: string): Promise<PreviewResultado>;
  previewReset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<PreviewResultado>;
  previewCherryPick(repoPath: string, hash: string): Promise<PreviewResultado>;
  previewRevert(repoPath: string, hash: string): Promise<PreviewResultado>;
}

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
} from '../entities/GitEntities.js';

export interface IGitRepository {
  isGitRepository(repoPath: string): Promise<boolean>;
  listRepositories(rootPath: string): Promise<RepositorySummaryEntity[]>;
  getStatus(repoPath: string): Promise<RepositoryStatusEntity>;
  getCommits(repoPath: string, maxCount?: number): Promise<CommitEntity[]>;
  getBranches(repoPath: string): Promise<BranchEntity[]>;
  getDiff(repoPath: string, filePath?: string, staged?: boolean): Promise<string>;
  stageFile(repoPath: string, filePath: string): Promise<void>;
  stageAll(repoPath: string): Promise<void>;
  unstageFile(repoPath: string, filePath: string): Promise<void>;
  commit(repoPath: string, message: string, description?: string): Promise<string>;
  checkout(repoPath: string, target: string): Promise<void>;
  createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void>;
  pull(repoPath: string): Promise<void>;
  push(repoPath: string): Promise<void>;
  
  // Remotos
  getRemotes(repoPath: string): Promise<RemoteEntity[]>;
  addRemote(repoPath: string, name: string, url: string): Promise<void>;
  removeRemote(repoPath: string, name: string): Promise<void>;
  fetchAll(repoPath: string, prune?: boolean): Promise<void>;

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
}

// Austria: Casos de Uso de la Capa de Aplicacion DDD para Git
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
} from '../../domain/entities/GitEntities.js';

export class GitUseCases {
  constructor(
    private gitRepository: IGitRepository,
    private logRepository: ICommandLogRepository
  ) {}

  async listRepositories(rootPath: string): Promise<RepositorySummaryEntity[]> {
    return await this.gitRepository.listRepositories(rootPath);
  }

  async getRepositoryStatus(repoPath: string): Promise<RepositoryStatusEntity> {
    return await this.gitRepository.getStatus(repoPath);
  }

  async getCommitGraph(repoPath: string, limit = 150): Promise<CommitEntity[]> {
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
    return await this.gitRepository.commit(repoPath, message, description);
  }

  async checkout(repoPath: string, target: string): Promise<void> {
    await this.gitRepository.checkout(repoPath, target);
  }

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    await this.gitRepository.createBranch(repoPath, branchName, startPoint);
  }

  async pull(repoPath: string): Promise<void> {
    await this.gitRepository.pull(repoPath);
  }

  async push(repoPath: string): Promise<void> {
    await this.gitRepository.push(repoPath);
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
    await this.gitRepository.fetchAll(repoPath, prune);
  }

  // Comparacion & Merge
  async compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<BranchComparisonEntity> {
    return await this.gitRepository.compareBranches(repoPath, baseBranch, targetBranch);
  }

  async merge(repoPath: string, sourceBranch: string, noFf = false): Promise<void> {
    await this.gitRepository.mergeBranch(repoPath, sourceBranch, noFf);
  }

  // Stash
  async getStashes(repoPath: string): Promise<StashEntity[]> {
    return await this.gitRepository.getStashes(repoPath);
  }

  async saveStash(repoPath: string, message?: string): Promise<void> {
    await this.gitRepository.saveStash(repoPath, message);
  }

  async popStash(repoPath: string, index = 0): Promise<void> {
    await this.gitRepository.popStash(repoPath, index);
  }

  async dropStash(repoPath: string, index = 0): Promise<void> {
    await this.gitRepository.dropStash(repoPath, index);
  }

  // Tags
  async getTags(repoPath: string): Promise<TagEntity[]> {
    return await this.gitRepository.getTags(repoPath);
  }

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    await this.gitRepository.createTag(repoPath, tagName, targetHash);
  }

  // Cherry-pick, Revert, Reset
  async cherryPick(repoPath: string, hash: string): Promise<void> {
    await this.gitRepository.cherryPick(repoPath, hash);
  }

  async revert(repoPath: string, hash: string): Promise<void> {
    await this.gitRepository.revertCommit(repoPath, hash);
  }

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    await this.gitRepository.reset(repoPath, type, target);
  }

  // Conflictos
  async getConflict(repoPath: string, filePath: string): Promise<ConflictEntity> {
    return await this.gitRepository.getConflictDetails(repoPath, filePath);
  }

  async resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void> {
    await this.gitRepository.resolveConflict(repoPath, filePath, resolvedContent);
  }

  // Logs
  getAuditLogs(): CommandLogEntity[] {
    return this.logRepository.getRecentLogs();
  }
}

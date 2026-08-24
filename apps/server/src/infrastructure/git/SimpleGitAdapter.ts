// Austria: Adaptador de infraestructura para simple-git implementando IGitRepository
import simpleGit, { SimpleGit, StatusResult, ResetMode } from 'simple-git';
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
  FileChangeEntity,
} from '../../domain/entities/GitEntities.js';

export class SimpleGitAdapter implements IGitRepository {
  constructor(private logRepository: ICommandLogRepository) {}

  private getGitInstance(repoPath: string): SimpleGit {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`El directorio no existe: ${repoPath}`);
    }
    return simpleGit({ baseDir: repoPath });
  }

  async isGitRepository(repoPath: string): Promise<boolean> {
    try {
      const git = this.getGitInstance(repoPath);
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async listRepositories(rootPath: string): Promise<RepositorySummaryEntity[]> {
    if (!fs.existsSync(rootPath)) {
      return [];
    }

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    const repos: RepositorySummaryEntity[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(rootPath, entry.name);
        const isGit = await this.isGitRepository(fullPath);
        let currentBranch: string | undefined = undefined;

        if (isGit) {
          try {
            const git = this.getGitInstance(fullPath);
            const status = await git.status();
            currentBranch = status.current ?? undefined;
          } catch {
            // Austria: Repositorio inicializado sin commits
          }
        }

        repos.push({
          name: entry.name,
          path: fullPath,
          isGitRepo: isGit,
          currentBranch,
        });
      }
    }

    return repos;
  }

  async getCommits(repoPath: string, maxCount: number = 150): Promise<CommitEntity[]> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);

    try {
      const logResult = await git.raw([
        'log',
        `-${maxCount}`,
        '--all',
        '--date=iso-strict',
        '--pretty=format:%H%x00%h%x00%P%x00%an%x00%ae%x00%ad%x00%s%x00%D%x01',
      ]);

      this.logRepository.addLog(`git log -${maxCount} --all`, Date.now() - start, true);

      if (!logResult.trim()) return [];

      const rawCommits = logResult.split('\x01').filter((c) => c.trim().length > 0);
      return rawCommits.map((raw) => {
        const [hash, shortHash, parentsStr, authorName, authorEmail, date, message, refStr] = raw.split('\x00');
        const parents = parentsStr ? parentsStr.trim().split(' ').filter(Boolean) : [];
        const refs = refStr ? refStr.split(',').map((r) => r.trim()).filter(Boolean) : [];

        const branches: string[] = [];
        const tags: string[] = [];

        refs.forEach((ref) => {
          if (ref.startsWith('tag: ')) {
            tags.push(ref.replace('tag: ', ''));
          } else if (ref.includes('HEAD -> ')) {
            branches.push(ref.replace('HEAD -> ', ''));
          } else if (!ref.includes('HEAD')) {
            branches.push(ref);
          }
        });

        return {
          hash: hash?.trim() || '',
          shortHash: shortHash?.trim() || '',
          parents,
          authorName: authorName || '',
          authorEmail: authorEmail || '',
          date: date || '',
          message: message || '',
          refs,
          branches,
          tags,
        };
      });
    } catch (err: any) {
      this.logRepository.addLog(`git log -${maxCount} --all`, Date.now() - start, false, undefined, err.message);
      return [];
    }
  }

  async getBranches(repoPath: string): Promise<BranchEntity[]> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const branchSummary = await git.branch(['-a', '-v']);
      this.logRepository.addLog('git branch -a -v', Date.now() - start, true);
      const branches: BranchEntity[] = [];

      for (const [name, info] of Object.entries(branchSummary.branches)) {
        branches.push({
          name,
          current: info.current,
          commit: info.commit,
          label: info.label,
          isRemote: name.startsWith('remotes/'),
        });
      }
      return branches;
    } catch (err: any) {
      this.logRepository.addLog('git branch -a -v', Date.now() - start, false, undefined, err.message);
      return [];
    }
  }

  async getStatus(repoPath: string): Promise<RepositoryStatusEntity> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const status: StatusResult = await git.status();
      this.logRepository.addLog('git status --porcelain', Date.now() - start, true);

      const files: FileChangeEntity[] = [];

      status.modified.forEach((file) => files.push({ path: file, status: 'modified', staged: false }));
      status.not_added.forEach((file) => files.push({ path: file, status: 'untracked', staged: false }));
      status.deleted.forEach((file) => files.push({ path: file, status: 'deleted', staged: false }));
      status.conflicted.forEach((file) => files.push({ path: file, status: 'conflicted', staged: false }));

      status.staged.forEach((file) => files.push({ path: file, status: 'modified', staged: true }));
      status.created.forEach((file) => files.push({ path: file, status: 'added', staged: true }));

      const gitDir = path.join(repoPath, '.git');
      const isMerging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
      const isRebasing =
        fs.existsSync(path.join(gitDir, 'rebase-apply')) || fs.existsSync(path.join(gitDir, 'rebase-merge'));

      return {
        currentBranch: status.current || 'HEAD desvinculado',
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
        files,
        tracking: status.tracking || undefined,
        isMerging,
        isRebasing,
      };
    } catch (err: any) {
      this.logRepository.addLog('git status --porcelain', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async getDiff(repoPath: string, filePath?: string, staged: boolean = false): Promise<string> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const options: string[] = [];
    if (staged) options.push('--cached');
    if (filePath) options.push('--', filePath);

    try {
      const diff = await git.diff(options);
      this.logRepository.addLog(`git diff ${options.join(' ')}`, Date.now() - start, true);
      return diff;
    } catch (err: any) {
      this.logRepository.addLog(`git diff ${options.join(' ')}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async stageFile(repoPath: string, filePath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.add(filePath);
      this.logRepository.addLog(`git add "${filePath}"`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git add "${filePath}"`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async stageAll(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.add('.');
      this.logRepository.addLog('git add .', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git add .', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async unstageFile(repoPath: string, filePath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.reset(['HEAD', '--', filePath]);
      this.logRepository.addLog(`git reset HEAD -- "${filePath}"`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git reset HEAD -- "${filePath}"`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async commit(repoPath: string, message: string, description?: string): Promise<string> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const fullMessage = description ? `${message}\n\n${description}` : message;
    try {
      const result = await git.commit(fullMessage);
      this.logRepository.addLog(`git commit -m "${message.substring(0, 30)}..."`, Date.now() - start, true);
      return result.commit;
    } catch (err: any) {
      this.logRepository.addLog('git commit', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async checkout(repoPath: string, target: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.checkout(target);
      this.logRepository.addLog(`git checkout ${target}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git checkout ${target}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      if (startPoint) {
        await git.checkoutBranch(branchName, startPoint);
        this.logRepository.addLog(`git checkout -b ${branchName} ${startPoint}`, Date.now() - start, true);
      } else {
        await git.checkoutLocalBranch(branchName);
        this.logRepository.addLog(`git checkout -b ${branchName}`, Date.now() - start, true);
      }
    } catch (err: any) {
      this.logRepository.addLog(`git branch ${branchName}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async pull(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.pull();
      this.logRepository.addLog('git pull', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git pull', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async push(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.push();
      this.logRepository.addLog('git push', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git push', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Remotos ---
  async getRemotes(repoPath: string): Promise<RemoteEntity[]> {
    const git = this.getGitInstance(repoPath);
    try {
      const remotes = await git.getRemotes(true);
      return remotes.map((r) => ({
        name: r.name,
        fetchUrl: r.refs.fetch || '',
        pushUrl: r.refs.push || '',
      }));
    } catch {
      return [];
    }
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.addRemote(name, url);
      this.logRepository.addLog(`git remote add ${name} ${url}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git remote add ${name} ${url}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.removeRemote(name);
      this.logRepository.addLog(`git remote remove ${name}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git remote remove ${name}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async fetchAll(repoPath: string, prune = true): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const options = prune ? ['--all', '--prune'] : ['--all'];
    try {
      await git.fetch(options);
      this.logRepository.addLog(`git fetch ${options.join(' ')}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git fetch', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Comparacion & Merge ---
  async compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<BranchComparisonEntity> {
    const git = this.getGitInstance(repoPath);
    try {
      const aheadBehindStr = await git.raw(['rev-list', '--left-right', '--count', `${baseBranch}...${targetBranch}`]);
      const [behindStr, aheadStr] = aheadBehindStr.trim().split(/\s+/);
      const behindCount = parseInt(behindStr) || 0;
      const aheadCount = parseInt(aheadStr) || 0;

      const diffSummary = await git.diffSummary([`${baseBranch}...${targetBranch}`]);
      const formattedSummary = `${diffSummary.changed} archivos modificados, +${diffSummary.insertions} inserciones, -${diffSummary.deletions} eliminaciones`;

      const commitsResult = await git.raw([
        'log',
        `${baseBranch}..${targetBranch}`,
        '--pretty=format:%H%x00%h%x00%P%x00%an%x00%ae%x00%ad%x00%s%x01',
      ]);

      const commits: CommitEntity[] = commitsResult
        .split('\x01')
        .filter((c) => c.trim().length > 0)
        .map((raw) => {
          const [hash, shortHash, parentsStr, authorName, authorEmail, date, message] = raw.split('\x00');
          return {
            hash: hash || '',
            shortHash: shortHash || '',
            parents: parentsStr ? parentsStr.trim().split(' ') : [],
            authorName: authorName || '',
            authorEmail: authorEmail || '',
            date: date || '',
            message: message || '',
          };
        });

      return {
        baseBranch,
        targetBranch,
        aheadCount,
        behindCount,
        commits,
        diffSummary: formattedSummary,
      };
    } catch (err: any) {
      throw new Error(`Error comparando ramas: ${err.message}`);
    }
  }

  async mergeBranch(repoPath: string, sourceBranch: string, noFf = false): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const options = noFf ? ['--no-ff', sourceBranch] : [sourceBranch];
    try {
      await git.merge(options);
      this.logRepository.addLog(`git merge ${options.join(' ')}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git merge ${sourceBranch}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Stash ---
  async getStashes(repoPath: string): Promise<StashEntity[]> {
    const git = this.getGitInstance(repoPath);
    try {
      const stashList = await git.stashList();
      return stashList.all.map((item, idx) => ({
        index: idx,
        message: item.message,
        hash: item.hash,
        date: item.date,
      }));
    } catch {
      return [];
    }
  }

  async saveStash(repoPath: string, message?: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      if (message) {
        await git.stash(['push', '-m', message]);
        this.logRepository.addLog(`git stash push -m "${message}"`, Date.now() - start, true);
      } else {
        await git.stash();
        this.logRepository.addLog('git stash', Date.now() - start, true);
      }
    } catch (err: any) {
      this.logRepository.addLog('git stash', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async popStash(repoPath: string, index = 0): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.stash(['pop', `stash@{${index}}`]);
      this.logRepository.addLog(`git stash pop stash@{${index}}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git stash pop', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async dropStash(repoPath: string, index = 0): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.stash(['drop', `stash@{${index}}`]);
      this.logRepository.addLog(`git stash drop stash@{${index}}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git stash drop', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Cherry-Pick, Revert, Reset ---
  async cherryPick(repoPath: string, hash: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.raw(['cherry-pick', hash]);
      this.logRepository.addLog(`git cherry-pick ${hash}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git cherry-pick ${hash}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async revertCommit(repoPath: string, hash: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.raw(['revert', '--no-edit', hash]);
      this.logRepository.addLog(`git revert --no-edit ${hash}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git revert ${hash}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const mode = type === 'soft' ? ResetMode.SOFT : type === 'hard' ? ResetMode.HARD : ResetMode.MIXED;
    try {
      await git.reset(mode, [target]);
      this.logRepository.addLog(`git reset --${type} ${target}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git reset --${type} ${target}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Tags ---
  async getTags(repoPath: string): Promise<TagEntity[]> {
    const git = this.getGitInstance(repoPath);
    try {
      const tagResult = await git.tags();
      return tagResult.all.map((name) => ({ name, hash: '' }));
    } catch {
      return [];
    }
  }

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      if (targetHash) {
        await git.tag([tagName, targetHash]);
        this.logRepository.addLog(`git tag ${tagName} ${targetHash}`, Date.now() - start, true);
      } else {
        await git.addTag(tagName);
        this.logRepository.addLog(`git tag ${tagName}`, Date.now() - start, true);
      }
    } catch (err: any) {
      this.logRepository.addLog(`git tag ${tagName}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Conflictos ---
  async getConflictDetails(repoPath: string, filePath: string): Promise<ConflictEntity> {
    const fullPath = path.join(repoPath, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`El archivo no existe: ${filePath}`);
    }

    const rawConflict = fs.readFileSync(fullPath, 'utf8');

    let currentContent = '';
    let incomingContent = '';

    const lines = rawConflict.split('\n');
    let inCurrent = false;
    let inIncoming = false;

    lines.forEach((line) => {
      if (line.startsWith('<<<<<<<')) {
        inCurrent = true;
      } else if (line.startsWith('=======')) {
        inCurrent = false;
        inIncoming = true;
      } else if (line.startsWith('>>>>>>>')) {
        inIncoming = false;
      } else if (inCurrent) {
        currentContent += line + '\n';
      } else if (inIncoming) {
        incomingContent += line + '\n';
      }
    });

    return {
      filePath,
      currentContent,
      incomingContent,
      baseContent: '',
      rawConflict,
    };
  }

  async resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void> {
    const fullPath = path.join(repoPath, filePath);
    fs.writeFileSync(fullPath, resolvedContent, 'utf8');
    await this.stageFile(repoPath, filePath);
  }
}

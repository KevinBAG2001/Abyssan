// Austria: Adaptador de infraestructura para simple-git implementando IGitRepository
import { simpleGit, SimpleGit, StatusResult, ResetMode } from 'simple-git';
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
  InfoAmendEntity,
  EntradaReflogEntity,
} from '../../domain/entities/GitEntities.js';
import { parsearHunksConflicto } from '../../application/conflictos/parsearConflictos.js';
import { almacenCredencialesForja } from '../credenciales/AlmacenCredencialesForja.js';
import { detectarForja, inyectarTokenHttps } from '../credenciales/inyectarTokenHttps.js';

const DIRECTORIOS_IGNORADOS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.pnpm-store',
  'target',
]);

function tieneMetadatosGit(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

export class SimpleGitAdapter implements IGitRepository {
  constructor(private logRepository: ICommandLogRepository) {}

  private getGitInstance(repoPath: string): SimpleGit {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`El directorio no existe: ${repoPath}`);
    }
    return simpleGit({ baseDir: repoPath });
  }

  async isGitRepository(repoPath: string): Promise<boolean> {
    if (tieneMetadatosGit(repoPath)) return true;
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
    const repos: RepositorySummaryEntity[] = [];
    await this.escanearRepositorios(rootPath, 0, 2, repos);
    return repos;
  }

  private async escanearRepositorios(
    dir: string,
    nivel: number,
    maxNivel: number,
    repos: RepositorySummaryEntity[]
  ): Promise<void> {
    if (nivel > maxNivel) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (DIRECTORIOS_IGNORADOS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (tieneMetadatosGit(fullPath)) {
        repos.push({
          name: nivel === 0 ? entry.name : `${path.basename(dir)}${path.sep}${entry.name}`,
          path: fullPath,
          isGitRepo: true,
        });
      } else if (nivel + 1 <= maxNivel) {
        await this.escanearRepositorios(fullPath, nivel + 1, maxNivel, repos);
      }
    }
  }

  private async urlConTokenSiAplica(url: string): Promise<string> {
    const forja = detectarForja(url);
    if (!forja) return url;
    const cred = almacenCredencialesForja.obtener(forja);
    if (!cred?.token) return url;
    return inyectarTokenHttps(url, cred.token, forja);
  }

  private async urlRemotoConToken(repoPath: string): Promise<string | undefined> {
    return this.urlRemotoNombradoConToken(repoPath, 'origin');
  }

  private async urlRemotoNombradoConToken(repoPath: string, nombre: string): Promise<string | undefined> {
    const git = this.getGitInstance(repoPath);
    try {
      const remotes = await git.getRemotes(true);
      const elegido = remotes.find((r) => r.name === nombre) || remotes[0];
      const url = elegido?.refs?.push || elegido?.refs?.fetch;
      if (!url) return undefined;
      const conToken = await this.urlConTokenSiAplica(url);
      return conToken !== url ? conToken : undefined;
    } catch {
      return undefined;
    }
  }

  async getCommits(repoPath: string, maxCount: number = 800): Promise<CommitEntity[]> {
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
    try {
      const gitRapido = simpleGit({ baseDir: repoPath, timeout: { block: 12_000 } });
      const status: StatusResult = await gitRapido.status(['--untracked-files=no', '--ignore-submodules=all']);
      let noTracked: string[] = [];
      try {
        const crudo = await gitRapido.raw(['ls-files', '-o', '--exclude-standard', '-z']);
        noTracked = crudo.split('\0').map((f) => f.trim()).filter(Boolean);
      } catch {
        // Sin untracked no impide mostrar rama y cambios tracked
      }

      const files: FileChangeEntity[] = [];
      status.modified.forEach((file) => files.push({ path: file, status: 'modified', staged: false }));
      status.deleted.forEach((file) => files.push({ path: file, status: 'deleted', staged: false }));
      status.conflicted.forEach((file) => files.push({ path: file, status: 'conflicted', staged: false }));
      status.staged.forEach((file) => files.push({ path: file, status: 'modified', staged: true }));
      status.created.forEach((file) => files.push({ path: file, status: 'added', staged: true }));
      const ya = new Set(files.map((f) => f.path));
      noTracked.forEach((file) => {
        if (!ya.has(file)) files.push({ path: file, status: 'untracked', staged: false });
      });

      const gitDir = path.join(repoPath, '.git');
      const isMerging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
      const isRebasing =
        fs.existsSync(path.join(gitDir, 'rebase-apply')) || fs.existsSync(path.join(gitDir, 'rebase-merge'));

      this.logRepository.addLog('git status --porcelain -uno', Date.now() - start, true);

      return {
        currentBranch: status.current || 'HEAD desvinculado',
        isClean: files.length === 0,
        ahead: status.ahead,
        behind: status.behind,
        files,
        tracking: status.tracking || undefined,
        isMerging,
        isRebasing,
      };
    } catch (err: any) {
      this.logRepository.addLog('git status --porcelain -uno', Date.now() - start, false, undefined, err.message);
      try {
        const rama = (await this.getGitInstance(repoPath).raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
        return {
          currentBranch: rama || 'HEAD desvinculado',
          isClean: true,
          ahead: 0,
          behind: 0,
          files: [],
        };
      } catch {
        throw err;
      }
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

  async pull(repoPath: string, modo: 'merge' | 'rebase' = 'merge'): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const args = modo === 'rebase' ? ['--rebase'] : ['--no-rebase'];
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        const status = await git.status();
        const rama = status.current || 'HEAD';
        const flags = modo === 'rebase' ? ['--rebase'] : ['--no-rebase'];
        await git.raw(['pull', ...flags, remotoToken, rama]);
      } else {
        await git.raw(['pull', ...args]);
      }
      this.logRepository.addLog(`git pull ${args.join(' ')}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git pull ${args.join(' ')}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async push(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        const status = await git.status();
        await git.push(remotoToken, status.current || 'HEAD');
      } else {
        await git.push();
      }
      this.logRepository.addLog('git push', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git push', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async discardArchivo(repoPath: string, filePath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const status = await git.status();
      const esSinSeguimiento = status.not_added.includes(filePath);
      if (esSinSeguimiento) {
        const full = path.join(repoPath, filePath);
        fs.rmSync(full, { recursive: true, force: true });
        this.logRepository.addLog(`discard untracked "${filePath}"`, Date.now() - start, true);
        return;
      }
      await git.raw(['restore', '--worktree', '--', filePath]);
      this.logRepository.addLog(`git restore --worktree -- "${filePath}"`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git restore -- "${filePath}"`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async deleteLocalBranch(repoPath: string, branchName: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const status = await git.status();
      if (status.current === branchName) {
        throw new Error('No se puede borrar la rama activa (HEAD)');
      }
      await git.deleteLocalBranch(branchName, true);
      this.logRepository.addLog(`git branch -D ${branchName}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git branch -D ${branchName}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async renameLocalBranch(repoPath: string, nombreActual: string, nombreNuevo: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.branch(['-m', nombreActual, nombreNuevo]);
      this.logRepository.addLog(`git branch -m ${nombreActual} ${nombreNuevo}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(
        `git branch -m ${nombreActual} ${nombreNuevo}`,
        Date.now() - start,
        false,
        undefined,
        err.message
      );
      throw err;
    }
  }

  async clonarRepositorio(url: string, destino: string): Promise<void> {
    const start = Date.now();
    if (fs.existsSync(destino) && fs.readdirSync(destino).length > 0) {
      throw new Error('La carpeta destino no está vacía');
    }
    const urlEfectiva = await this.urlConTokenSiAplica(url);
    try {
      await simpleGit().clone(urlEfectiva, destino);
      this.logRepository.addLog(`git clone ${url} ${destino}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git clone ${url}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async inicializarRepositorio(destino: string): Promise<void> {
    const start = Date.now();
    if (!fs.existsSync(destino)) {
      fs.mkdirSync(destino, { recursive: true });
    }
    const contenido = fs.readdirSync(destino).filter((n) => n !== '.' && n !== '..');
    if (contenido.length > 0) {
      throw new Error('La carpeta debe estar vacía para inicializar un repositorio');
    }
    try {
      await simpleGit(destino).init();
      this.logRepository.addLog(`git init ${destino}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git init', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async abortarMerge(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      await git.raw(['merge', '--abort']);
      this.logRepository.addLog('git merge --abort', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git merge --abort', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async continuarMerge(repoPath: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const status = await git.status();
      if (status.conflicted.length > 0) {
        throw new Error('Aún hay conflictos sin resolver');
      }
      const mergeMsgPath = path.join(repoPath, '.git', 'MERGE_MSG');
      const mensaje = fs.existsSync(mergeMsgPath) ? fs.readFileSync(mergeMsgPath, 'utf8') : 'Merge';
      await git.commit(mensaje);
      this.logRepository.addLog('git commit (continuar merge)', Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git merge --continue', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async obtenerInfoAmend(repoPath: string): Promise<InfoAmendEntity> {
    const git = this.getGitInstance(repoPath);
    const log = await git.log({ maxCount: 1 });
    if (!log.latest) {
      throw new Error('No hay commits para enmendar');
    }
    let email = '';
    try {
      email = (await git.raw(['config', 'user.email'])).trim();
    } catch {
      email = '';
    }
    const esNuestro = Boolean(email) && log.latest.author_email === email;
    let estaEnRemoto = false;
    try {
      const contiene = await git.raw(['branch', '-r', '--contains', log.latest.hash]);
      estaEnRemoto = contiene.trim().length > 0;
    } catch {
      estaEnRemoto = false;
    }
    return {
      esNuestro,
      estaEnRemoto,
      mensaje: log.latest.message,
      hash: log.latest.hash,
    };
  }

  async enmendarCommit(repoPath: string, message: string): Promise<string> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    try {
      const result = await git.commit(message, undefined, { '--amend': null });
      this.logRepository.addLog('git commit --amend', Date.now() - start, true);
      return result.commit;
    } catch (err: any) {
      this.logRepository.addLog('git commit --amend', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async obtenerReflog(repoPath: string, limite = 20): Promise<EntradaReflogEntity[]> {
    const git = this.getGitInstance(repoPath);
    try {
      const raw = await git.raw([
        'reflog',
        `-n${limite}`,
        '--pretty=format:%h%x00%gd%x00%gs%x00%ci%x01',
      ]);
      return raw
        .split('\x01')
        .filter((l) => l.trim().length > 0)
        .map((linea) => {
          const [hash, selector, mensaje, fecha] = linea.split('\x00');
          return {
            hash: hash?.trim() || '',
            selector: selector?.trim() || '',
            mensaje: mensaje?.trim() || '',
            fecha: fecha?.trim() || '',
          };
        });
    } catch {
      return [];
    }
  }

  async recrearRama(repoPath: string, branchName: string, hash: string): Promise<void> {
    const git = this.getGitInstance(repoPath);
    await git.raw(['branch', branchName, hash]);
    this.logRepository.addLog(`git branch ${branchName} ${hash.substring(0, 7)}`, 0, true);
  }

  async escribirArchivoRelativo(repoPath: string, filePath: string, contenido: string): Promise<void> {
    const full = path.join(repoPath, filePath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, contenido, 'utf8');
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
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        await git.raw(['fetch', remotoToken, ...(prune ? ['--prune'] : [])]);
      } else {
        await git.fetch(options);
      }
      this.logRepository.addLog(`git fetch ${options.join(' ')}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog('git fetch', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async fetchRefspec(repoPath: string, remoto: string, refspec: string): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const urlToken = await this.urlRemotoNombradoConToken(repoPath, remoto);
    const destino = urlToken || remoto;
    try {
      await git.raw(['fetch', destino, refspec]);
      this.logRepository.addLog(`git fetch ${remoto} ${refspec}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git fetch ${remoto} ${refspec}`, Date.now() - start, false, undefined, err.message);
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
    const rawConflict = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
    const git = this.getGitInstance(repoPath);

    const leerEtapa = async (etapa: '1' | '2' | '3'): Promise<string> => {
      try {
        return await git.show([`:${etapa}:${filePath}`]);
      } catch {
        return '';
      }
    };

    const [baseContent, ours, theirs] = await Promise.all([
      leerEtapa('1'),
      leerEtapa('2'),
      leerEtapa('3'),
    ]);

    const hunks = parsearHunksConflicto(rawConflict);
    const currentContent = ours || hunks.map((h) => h.actual).join('\n') || '';
    const incomingContent = theirs || hunks.map((h) => h.entrante).join('\n') || '';

    return {
      filePath,
      currentContent,
      incomingContent,
      baseContent,
      rawConflict,
      baseDisponible: baseContent.length > 0,
      hunks,
    };
  }

  async resolveConflict(repoPath: string, filePath: string, resolvedContent: string): Promise<void> {
    const fullPath = path.join(repoPath, filePath);
    fs.writeFileSync(fullPath, resolvedContent, 'utf8');
    await this.stageFile(repoPath, filePath);
  }
}

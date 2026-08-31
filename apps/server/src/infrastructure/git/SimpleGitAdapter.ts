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
  PreviewOperacionEntity,
  ArchivoAfectadoPreview,
} from '../../domain/entities/GitEntities.js';
import type { EscuchaProgresoGit } from '../../domain/entities/GitOperacion.js';
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

  private opcionesProgreso(onProgreso?: EscuchaProgresoGit) {
    if (!onProgreso) return {};
    return {
      progress: ({ method, stage, progress }: { method: string; stage: string; progress: number }) => {
        onProgreso({ etapa: stage || method, porcentaje: Number.isFinite(progress) ? progress : 0 });
      },
    };
  }

  private getGitInstance(repoPath: string, onProgreso?: EscuchaProgresoGit): SimpleGit {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`El directorio no existe: ${repoPath}`);
    }
    return simpleGit({ baseDir: repoPath, ...this.opcionesProgreso(onProgreso) });
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

  async pull(
    repoPath: string,
    modo: 'merge' | 'rebase' = 'merge',
    onProgreso?: EscuchaProgresoGit
  ): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath, onProgreso);
    const args = modo === 'rebase' ? ['--rebase'] : ['--no-rebase'];
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        const status = await git.status();
        const rama = status.current || 'HEAD';
        const flags = modo === 'rebase' ? ['--rebase'] : ['--no-rebase'];
        await git.raw(['pull', ...flags, '--progress', remotoToken, rama]);
      } else {
        await git.raw(['pull', ...args, '--progress']);
      }
      this.logRepository.addLog(`git pull ${args.join(' ')}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git pull ${args.join(' ')}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async push(repoPath: string, onProgreso?: EscuchaProgresoGit): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath, onProgreso);
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        const status = await git.status();
        await git.raw(['push', '--progress', remotoToken, status.current || 'HEAD']);
      } else {
        await git.raw(['push', '--progress']);
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

  async clonarRepositorio(url: string, destino: string, onProgreso?: EscuchaProgresoGit): Promise<void> {
    const start = Date.now();
    if (fs.existsSync(destino) && fs.readdirSync(destino).length > 0) {
      throw new Error('La carpeta destino no está vacía');
    }
    const urlEfectiva = await this.urlConTokenSiAplica(url);
    try {
      await simpleGit({ ...this.opcionesProgreso(onProgreso) }).clone(urlEfectiva, destino, ['--progress']);
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

  async fetchAll(repoPath: string, prune = true, onProgreso?: EscuchaProgresoGit): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath, onProgreso);
    const options = prune ? ['--all', '--prune'] : ['--all'];
    const remotoToken = await this.urlRemotoConToken(repoPath);
    try {
      if (remotoToken) {
        await git.raw(['fetch', '--progress', remotoToken, ...(prune ? ['--prune'] : [])]);
      } else {
        await git.fetch([...options, '--progress']);
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

  // --- Identidad del autor git ---

  async obtenerIdentidad(repoPath: string): Promise<{ nombre: string; correo: string; alcance: 'local' | 'global' }> {
    const git = this.getGitInstance(repoPath);
    let nombre = '';
    let correo = '';
    let alcance: 'local' | 'global' = 'global';

    try { nombre = (await git.raw(['config', '--local', 'user.name'])).trim(); } catch { /* sin config local */ }
    try { correo = (await git.raw(['config', '--local', 'user.email'])).trim(); } catch { /* sin config local */ }

    if (nombre || correo) {
      alcance = 'local';
    } else {
      try { nombre = (await git.raw(['config', '--global', 'user.name'])).trim(); } catch { /* sin config global */ }
      try { correo = (await git.raw(['config', '--global', 'user.email'])).trim(); } catch { /* sin config global */ }
    }

    return { nombre, correo, alcance };
  }

  async configurarIdentidad(repoPath: string, nombre: string, correo: string, global: boolean): Promise<void> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const scope = global ? '--global' : '--local';
    try {
      await git.raw(['config', scope, 'user.name', nombre]);
      await git.raw(['config', scope, 'user.email', correo]);
      this.logRepository.addLog(`git config ${scope} user.name/email`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git config ${scope} user.name/email`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  // --- Preview de operaciones peligrosas (no mutante) ---

  private async obtenerCommitsEntre(git: SimpleGit, desde: string, hasta: string): Promise<CommitEntity[]> {
    try {
      const raw = await git.raw([
        'log', `${desde}..${hasta}`,
        '--pretty=format:%H%x00%h%x00%P%x00%an%x00%ae%x00%ad%x00%s%x01',
        '--date=iso-strict',
      ]);
      if (!raw.trim()) return [];
      return raw.split('\x01').filter((c) => c.trim()).map((linea) => {
        const [hash, shortHash, parentsStr, authorName, authorEmail, date, message] = linea.split('\x00');
        return {
          hash: hash?.trim() || '', shortHash: shortHash?.trim() || '',
          parents: parentsStr ? parentsStr.trim().split(' ').filter(Boolean) : [],
          authorName: authorName || '', authorEmail: authorEmail || '',
          date: date || '', message: message || '',
        };
      });
    } catch { return []; }
  }

  private parsearArchivosDeNumstat(numstat: string): ArchivoAfectadoPreview[] {
    return numstat.split('\n').filter((l) => l.trim()).map((linea) => {
      const [added, deleted, filePath] = linea.split('\t');
      const tipo: ArchivoAfectadoPreview['tipo'] =
        added === '0' && deleted !== '0' ? 'eliminado'
        : added !== '0' && deleted === '0' ? 'agregado'
        : 'modificado';
      return { path: filePath || '', tipo };
    }).filter((a) => a.path);
  }

  async previewMerge(repoPath: string, sourceBranch: string): Promise<PreviewOperacionEntity> {
    const git = this.getGitInstance(repoPath);
    const riesgos: string[] = [];
    const conflictos: string[] = [];
    let viable = true;

    const status = await git.status();
    const ramaActual = status.current || 'HEAD';
    if (status.files.length > 0) {
      riesgos.push('Hay cambios sin commitear que podrían interferir con el merge.');
    }

    // merge-base
    let mergeBase: string;
    try {
      mergeBase = (await git.raw(['merge-base', ramaActual, sourceBranch])).trim();
    } catch {
      return {
        operacion: 'merge', viable: false, conflictos: [], commitsAfectados: [],
        archivosAfectados: [], riesgos: [`No se encontró ancestro común entre ${ramaActual} y ${sourceBranch}.`],
        resumen: `No se puede hacer merge: sin ancestro común.`,
      };
    }

    // Detectar conflictos con merge-tree (Git 2.38+)
    try {
      const result = await git.raw(['merge-tree', '--write-tree', '--no-messages', ramaActual, sourceBranch]);
      const lineas = result.trim().split('\n');
      const treeHash = lineas[0];
      // Si hay archivos conflictivos, se listan después del hash
      for (let i = 1; i < lineas.length; i++) {
        const l = lineas[i].trim();
        if (l) conflictos.push(l);
      }
    } catch (err: any) {
      // merge-tree retorna exit code 1 si hay conflictos (Git 2.38+)
      const salida = err.message || '';
      const lineas = salida.split('\n');
      for (const l of lineas) {
        const trimmed = l.trim();
        if (trimmed && !trimmed.startsWith('CONFLICT') && trimmed.length === 40) continue;
        if (trimmed.startsWith('CONFLICT')) {
          const match = trimmed.match(/CONFLICT \([^)]+\): .* (\S+)$/);
          if (match) conflictos.push(match[1]);
          else conflictos.push(trimmed);
        }
      }
      if (conflictos.length === 0) {
        // Fallback: usar diff para estimar
        try {
          const diffNames = await git.raw(['diff', '--name-only', `${ramaActual}...${sourceBranch}`]);
          const archivosSource = new Set(diffNames.trim().split('\n').filter(Boolean));
          const diffLocal = await git.raw(['diff', '--name-only', `${mergeBase}..${ramaActual}`]);
          const archivosLocal = new Set(diffLocal.trim().split('\n').filter(Boolean));
          for (const f of archivosSource) {
            if (archivosLocal.has(f)) conflictos.push(f);
          }
        } catch { /* sin estimación */ }
      }
    }

    if (conflictos.length > 0) {
      riesgos.push(`${conflictos.length} archivo(s) en conflicto requieren resolución manual.`);
    }

    const commitsAfectados = await this.obtenerCommitsEntre(git, ramaActual, sourceBranch);

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${ramaActual}...${sourceBranch}`]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat);
      // Marcar los que tienen conflicto
      const setConflictos = new Set(conflictos);
      archivosAfectados = archivosAfectados.map((a) =>
        setConflictos.has(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    } catch { /* sin detalle de archivos */ }

    const resumen = conflictos.length > 0
      ? `Merge de ${sourceBranch} → ${ramaActual}: ${commitsAfectados.length} commit(s), ${conflictos.length} conflicto(s).`
      : `Merge de ${sourceBranch} → ${ramaActual}: ${commitsAfectados.length} commit(s), sin conflictos.`;

    return { operacion: 'merge', viable, conflictos, commitsAfectados, archivosAfectados, riesgos, resumen };
  }

  async previewReset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<PreviewOperacionEntity> {
    const git = this.getGitInstance(repoPath);
    const riesgos: string[] = [];

    const headHash = (await git.raw(['rev-parse', 'HEAD'])).trim();
    const targetHash = (await git.raw(['rev-parse', target])).trim();

    if (headHash === targetHash) {
      return {
        operacion: 'reset', viable: true, conflictos: [], commitsAfectados: [],
        archivosAfectados: [], riesgos: [],
        resumen: `HEAD ya apunta a ${target.substring(0, 7)}. El reset no tendrá efecto.`,
      };
    }

    const commitsPerdidos = await this.obtenerCommitsEntre(git, targetHash, headHash);

    if (type === 'hard') {
      riesgos.push('reset --hard descarta todos los cambios del working tree y staging. Esta operación es destructiva.');
      const status = await git.status();
      if (status.files.length > 0) {
        riesgos.push(`${status.files.length} archivo(s) con cambios locales serán descartados permanentemente.`);
      }
    } else if (type === 'mixed') {
      riesgos.push('reset --mixed mueve los cambios de los commits al working tree (unstaged).');
    } else {
      riesgos.push('reset --soft mantiene todos los cambios en staging.');
    }

    if (commitsPerdidos.length > 0) {
      riesgos.push(`${commitsPerdidos.length} commit(s) dejarán de ser alcanzables desde HEAD (recuperables vía reflog).`);
    }

    // Comprobar si algún commit ya está en remoto
    try {
      const remoteBranches = await git.raw(['branch', '-r', '--contains', headHash]);
      if (remoteBranches.trim()) {
        riesgos.push('Algunos commits ya están en el remoto; un push posterior requerirá --force.');
      }
    } catch { /* sin info de remoto */ }

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${targetHash}..${headHash}`]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat);
    } catch { /* sin detalle */ }

    return {
      operacion: 'reset', viable: true, conflictos: [],
      commitsAfectados: commitsPerdidos, archivosAfectados, riesgos,
      resumen: `Reset --${type} a ${target.substring(0, 7)}: ${commitsPerdidos.length} commit(s) retrocedidos, ${archivosAfectados.length} archivo(s) afectados.`,
    };
  }

  async previewCherryPick(repoPath: string, hash: string): Promise<PreviewOperacionEntity> {
    const git = this.getGitInstance(repoPath);
    const riesgos: string[] = [];

    // Obtener info del commit
    const commitInfo: CommitEntity[] = await this.obtenerCommitsEntre(git, `${hash}~1`, hash).catch((): CommitEntity[] => []);
    if (commitInfo.length === 0) {
      try {
        const raw = await git.raw(['log', '-1', '--pretty=format:%H%x00%h%x00%P%x00%an%x00%ae%x00%ad%x00%s', hash]);
        const [h, sh, p, an, ae, d, m] = raw.split('\x00');
        commitInfo.push({
          hash: h || '', shortHash: sh || '',
          parents: p ? p.trim().split(' ').filter(Boolean) : [],
          authorName: an || '', authorEmail: ae || '', date: d || '', message: m || '',
        });
      } catch { /* sin info */ }
    }

    // Estimar archivos afectados
    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${hash}~1`, hash]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat);
    } catch { /* sin detalle */ }

    // Estimar conflictos: archivos tocados por el commit que también difieren en HEAD
    const conflictos: string[] = [];
    try {
      const archivosCommit = new Set(archivosAfectados.map((a) => a.path));
      const status = await git.status();
      for (const f of status.modified) {
        if (archivosCommit.has(f)) conflictos.push(f);
      }
      // Verificar si ya existe en HEAD con diferencias
      const headDiff = await git.raw(['diff', '--name-only', 'HEAD']);
      for (const f of headDiff.trim().split('\n').filter(Boolean)) {
        if (archivosCommit.has(f) && !conflictos.includes(f)) conflictos.push(f);
      }
    } catch { /* sin estimación */ }

    if (conflictos.length > 0) {
      riesgos.push(`${conflictos.length} archivo(s) podrían generar conflictos.`);
      archivosAfectados = archivosAfectados.map((a) =>
        conflictos.includes(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    }

    const status = await git.status();
    if (status.files.length > 0) {
      riesgos.push('Hay cambios sin commitear que podrían interferir.');
    }

    return {
      operacion: 'cherry-pick', viable: true, conflictos,
      commitsAfectados: commitInfo, archivosAfectados, riesgos,
      resumen: `Cherry-pick de ${hash.substring(0, 7)}: ${archivosAfectados.length} archivo(s) afectados.`,
    };
  }

  async previewRevert(repoPath: string, hash: string): Promise<PreviewOperacionEntity> {
    const git = this.getGitInstance(repoPath);
    const riesgos: string[] = [];

    const commitInfo: CommitEntity[] = [];
    try {
      const raw = await git.raw(['log', '-1', '--pretty=format:%H%x00%h%x00%P%x00%an%x00%ae%x00%ad%x00%s', hash]);
      const [h, sh, p, an, ae, d, m] = raw.split('\x00');
      commitInfo.push({
        hash: h || '', shortHash: sh || '',
        parents: p ? p.trim().split(' ').filter(Boolean) : [],
        authorName: an || '', authorEmail: ae || '', date: d || '', message: m || '',
      });
    } catch { /* sin info */ }

    if (commitInfo[0]?.parents?.length > 1) {
      riesgos.push('El commit es un merge commit; revert de merges puede tener efectos inesperados.');
    }

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${hash}~1`, hash]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat).map((a) => ({
        ...a,
        tipo: a.tipo === 'agregado' ? 'eliminado' as const
            : a.tipo === 'eliminado' ? 'agregado' as const
            : a.tipo,
      }));
    } catch { /* sin detalle */ }

    // Estimar conflictos
    const conflictos: string[] = [];
    try {
      const archivosRevert = new Set(archivosAfectados.map((a) => a.path));
      const diffSinceCommit = await git.raw(['diff', '--name-only', hash, 'HEAD']);
      for (const f of diffSinceCommit.trim().split('\n').filter(Boolean)) {
        if (archivosRevert.has(f)) conflictos.push(f);
      }
    } catch { /* sin estimación */ }

    if (conflictos.length > 0) {
      riesgos.push(`${conflictos.length} archivo(s) modificados después del commit podrían generar conflictos.`);
      archivosAfectados = archivosAfectados.map((a) =>
        conflictos.includes(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    }

    return {
      operacion: 'revert', viable: true, conflictos,
      commitsAfectados: commitInfo, archivosAfectados, riesgos,
      resumen: `Revert de ${hash.substring(0, 7)}: ${archivosAfectados.length} archivo(s) afectados, creará un nuevo commit.`,
    };
  }
}

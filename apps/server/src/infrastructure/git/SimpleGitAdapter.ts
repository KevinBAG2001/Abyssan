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
  InfoAmendEntity,
  EntradaReflogEntity,
  PreviewResultado,
  ArchivoAfectadoPreview,
  EstadoRefPreview,
  TipoOperacionPreview,
  ArchivoCambioEntity,
  OpcionesDiff,
} from '../../domain/entities/GitEntities.js';
import type { EscuchaProgresoGit } from '../../domain/entities/GitOperacion.js';
import { parsearHunksConflicto } from '../../application/conflictos/parsearConflictos.js';
import { almacenCredencialesForja } from '../credenciales/AlmacenCredencialesForja.js';
import {
  detectarForja,
  inyectarTokenHttps,
  mensajePushSinCredencial,
  tokenForjaDesdeEntorno,
} from '../credenciales/inyectarTokenHttps.js';
import { mapearEstadoPorcelain } from './mapearEstadoPorcelain.js';
import { construirDiffArchivoNuevo, LIMITE_DIFF_ARCHIVO_NUEVO } from './diffArchivoNuevo.js';
import { parsearNameStatus } from './parsearNameStatus.js';
import { ejecutarEnClonTemporal } from './sandboxGit.js';
import { extraerConflictosMergeTree } from './extraerConflictosMergeTree.js';
import { validarHashGit, validarRutaRepositorio } from '../seguridad/validarRutaRepositorio.js';
import { validarRefRecuperacion } from '../seguridad/politicaRefs.js';

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
    if (tieneMetadatosGit(rootPath)) {
      repos.push({
        name: path.basename(rootPath) || rootPath,
        path: rootPath,
        isGitRepo: true,
      });
      return repos;
    }
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

  private tokenForja(forja: ReturnType<typeof detectarForja>): string | undefined {
    if (!forja) return undefined;
    const deAlmacen = almacenCredencialesForja.obtener(forja)?.token?.trim();
    return deAlmacen || tokenForjaDesdeEntorno(forja);
  }

  private async urlConTokenSiAplica(url: string): Promise<string> {
    const forja = detectarForja(url);
    if (!forja) return url;
    const token = this.tokenForja(forja);
    if (!token) return url;
    return inyectarTokenHttps(url, token, forja);
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

      const files = mapearEstadoPorcelain(status.files, noTracked);

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

  async getDiff(
    repoPath: string,
    filePath?: string,
    staged: boolean = false,
    opciones?: OpcionesDiff
  ): Promise<string> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);

    try {
      if (opciones?.desde && opciones?.hasta && filePath) {
        const diff = await git.diff([`${opciones.desde}...${opciones.hasta}`, '--', filePath]);
        this.logRepository.addLog(`git diff ${opciones.desde}...${opciones.hasta} -- ${filePath}`, Date.now() - start, true);
        return diff;
      }
      if (opciones?.commit && filePath) {
        const diffCommit = await this.diffDeCommit(git, opciones.commit, filePath);
        this.logRepository.addLog(`git diff ${opciones.commit} -- ${filePath}`, Date.now() - start, true);
        return diffCommit;
      }

      const options: string[] = [];
      if (staged) options.push('--cached');
      if (filePath) options.push('--', filePath);

      const diff = await git.diff(options);
      if (diff) {
        this.logRepository.addLog(`git diff ${options.join(' ')}`, Date.now() - start, true);
        return diff;
      }
      if (!staged && filePath) {
        const sintetico = await this.diffSiEsNuevoSinSeguimiento(repoPath, git, filePath);
        if (sintetico !== null) {
          this.logRepository.addLog(`git diff ${options.join(' ')} (archivo nuevo)`, Date.now() - start, true);
          return sintetico;
        }
      }
      this.logRepository.addLog(`git diff ${options.join(' ')}`, Date.now() - start, true);
      return diff;
    } catch (err: any) {
      this.logRepository.addLog('git diff', Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  private async diffDeCommit(git: SimpleGit, hash: string, filePath: string): Promise<string> {
    try {
      return await git.diff([`${hash}^`, hash, '--', filePath]);
    } catch {
      try {
        const contenido = await git.show([`${hash}:${filePath}`]);
        return construirDiffArchivoNuevo(filePath, contenido);
      } catch {
        return '';
      }
    }
  }

  async listarArchivosCommit(repoPath: string, hash: string): Promise<ArchivoCambioEntity[]> {
    const git = this.getGitInstance(repoPath);
    const crudo = await git.raw(['diff-tree', '--no-commit-id', '--name-status', '-r', '-M', '--root', hash]);
    return parsearNameStatus(crudo);
  }

  async listarArchivosEntreRefs(repoPath: string, base: string, target: string): Promise<ArchivoCambioEntity[]> {
    const git = this.getGitInstance(repoPath);
    const crudo = await git.raw(['diff', '--name-status', '-M', `${base}...${target}`]);
    return parsearNameStatus(crudo);
  }

  /** `git diff` no lista untracked; el visor de la UI quedaba vacío al inspeccionar un archivo nuevo. */
  private async diffSiEsNuevoSinSeguimiento(
    repoPath: string,
    git: SimpleGit,
    filePath: string
  ): Promise<string | null> {
    let porcelain = '';
    try {
      porcelain = (await git.raw(['status', '--porcelain', '--', filePath])).trim();
    } catch {
      return null;
    }
    if (!porcelain.startsWith('??')) return null;

    const abs = path.join(repoPath, filePath);
    if (!fs.existsSync(abs)) return null;
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return null;
    if (stat.size > LIMITE_DIFF_ARCHIVO_NUEVO) {
      return construirDiffArchivoNuevo(filePath, '', { omitidoPorTamano: true });
    }
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) {
      return construirDiffArchivoNuevo(filePath, '', { binario: true });
    }
    return construirDiffArchivoNuevo(filePath, buf.toString('utf8'));
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
    const status = await git.status();
    const rama = status.current || 'HEAD';
    const sinUpstream = !status.tracking;
    if (!remotoToken) {
      const remotes = await git.getRemotes(true);
      const elegido = remotes.find((r) => r.name === 'origin') || remotes[0];
      const urlOrigin = elegido?.refs?.push || elegido?.refs?.fetch || '';
      const forja = detectarForja(urlOrigin);
      if (forja) {
        throw new Error(mensajePushSinCredencial(forja));
      }
    }
    try {
      if (remotoToken) {
        const args = sinUpstream
          ? ['push', '--set-upstream', '--progress', remotoToken, rama]
          : ['push', '--progress', remotoToken, rama];
        await git.raw(args);
      } else {
        const args = sinUpstream
          ? ['push', '--set-upstream', '--progress', 'origin', rama]
          : ['push', '--progress'];
        await git.raw(args);
      }
      this.logRepository.addLog(`git push${sinUpstream ? ' --set-upstream' : ''}`, Date.now() - start, true);
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
      const archivos = await this.listarArchivosEntreRefs(repoPath, baseBranch, targetBranch);

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
        archivos,
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

    try { nombre = (await git.raw(['config', '--local', '--includes', '--get', 'user.name'])).trim(); } catch { /* sin config local */ }
    try { correo = (await git.raw(['config', '--local', '--includes', '--get', 'user.email'])).trim(); } catch { /* sin config local */ }

    if (nombre || correo) {
      alcance = 'local';
    } else {
      try { nombre = (await git.raw(['config', '--global', '--includes', '--get', 'user.name'])).trim(); } catch { /* sin config global */ }
      try { correo = (await git.raw(['config', '--global', '--includes', '--get', 'user.email'])).trim(); } catch { /* sin config global */ }
    }

    if (!nombre && !correo) {
      nombre = (process.env.GIT_AUTHOR_NAME ?? process.env.GIT_COMMITTER_NAME ?? '').trim();
      correo = (process.env.GIT_AUTHOR_EMAIL ?? process.env.GIT_COMMITTER_EMAIL ?? '').trim();
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

  async obtenerHashHead(repoPath: string): Promise<string> {
    try {
      return (await this.getGitInstance(repoPath).raw(['rev-parse', 'HEAD'])).trim();
    } catch {
      return '';
    }
  }

  async anclarRefRecuperacion(repoPath: string, ref: string, hash: string): Promise<void> {
    const repo = validarRutaRepositorio(repoPath);
    const segura = validarRefRecuperacion(ref);
    const objeto = validarHashGit(hash);
    const start = Date.now();
    const git = this.getGitInstance(repo);
    try {
      await git.raw(['update-ref', segura, objeto]);
      const resuelta = (await git.raw(['rev-parse', '--verify', '--end-of-options', segura])).trim();
      if (resuelta.toLowerCase() !== objeto.toLowerCase()) {
        throw new Error('La ref de recuperación no quedó apuntando al commit esperado');
      }
      this.logRepository.addLog(`git update-ref ${segura} ${objeto.substring(0, 7)}`, Date.now() - start, true);
    } catch (err: any) {
      this.logRepository.addLog(`git update-ref ${segura}`, Date.now() - start, false, undefined, err.message);
      throw err;
    }
  }

  async resolverRefRecuperacion(repoPath: string, ref: string): Promise<string | null> {
    const repo = validarRutaRepositorio(repoPath);
    const segura = validarRefRecuperacion(ref);
    try {
      const hash = (await this.getGitInstance(repo).raw(['rev-parse', '--verify', '--end-of-options', segura])).trim();
      if (!/^[0-9a-f]{40}$/i.test(hash)) return null;
      return hash.toLowerCase();
    } catch {
      return null;
    }
  }

  async borrarRefRecuperacion(repoPath: string, ref: string): Promise<void> {
    const repo = validarRutaRepositorio(repoPath);
    const segura = validarRefRecuperacion(ref);
    try {
      await this.getGitInstance(repo).raw(['update-ref', '-d', segura]);
      this.logRepository.addLog(`git update-ref -d ${segura}`, 0, true);
    } catch {
      // La ref ya no existe. No es un fallo de recuperación.
    }
  }

  async listarRefsRecuperacion(repoPath: string): Promise<string[]> {
    const repo = validarRutaRepositorio(repoPath);
    try {
      const raw = await this.getGitInstance(repo).raw([
        'for-each-ref',
        '--format=%(refname)',
        'refs/abyssan/recovery',
      ]);
      return raw
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => {
          if (!linea) return false;
          try {
            validarRefRecuperacion(linea);
            return true;
          } catch {
            return false;
          }
        });
    } catch {
      return [];
    }
  }

  async mergeBase(repoPath: string, refA: string, refB: string): Promise<string | null> {
    const git = simpleGit(repoPath);
    try {
      const result = await git.raw(['merge-base', refA, refB]);
      return result.trim() || null;
    } catch {
      return null;
    }
  }

  private crearPreview(
    operacion: TipoOperacionPreview,
    repositorio: string,
    estadoActual: EstadoRefPreview,
    estadoObjetivo: EstadoRefPreview,
    extras: Partial<Omit<PreviewResultado, 'operacion' | 'repositorio' | 'estadoActual' | 'estadoObjetivo'>> = {},
  ): PreviewResultado {
    return {
      operacion,
      repositorio,
      estadoActual,
      estadoObjetivo,
      commitsAfectados: extras.commitsAfectados ?? [],
      archivosAfectados: extras.archivosAfectados ?? [],
      posiblesConflictos: extras.posiblesConflictos ?? [],
      advertencias: extras.advertencias ?? [],
      seguroEjecutar: extras.seguroEjecutar ?? false,
      explicacion: extras.explicacion ?? '',
    };
  }

  private async describirRef(git: SimpleGit, ref: string): Promise<EstadoRefPreview> {
    const head = (await git.raw(['rev-parse', ref])).trim();
    let rama: string | undefined;
    try {
      const abb = (await git.raw(['rev-parse', '--abbrev-ref', ref])).trim();
      if (abb && abb !== 'HEAD') rama = abb;
    } catch {
      // hash u otro árbol sin nombre de rama
    }
    return { head, rama };
  }

  private async estimarConflictosPorSolape(
    git: SimpleGit,
    ramaActual: string,
    sourceBranch: string,
    mergeBase: string,
  ): Promise<string[]> {
    try {
      const diffNames = await git.raw(['diff', '--name-only', `${ramaActual}...${sourceBranch}`]);
      const archivosSource = new Set(diffNames.trim().split('\n').filter(Boolean));
      const diffLocal = await git.raw(['diff', '--name-only', `${mergeBase}..${ramaActual}`]);
      const archivosLocal = new Set(diffLocal.trim().split('\n').filter(Boolean));
      return [...archivosSource].filter((f) => archivosLocal.has(f));
    } catch {
      return [];
    }
  }

  /**
   * Conflictos de merge sin tocar el repo del usuario: clon temporal + merge --no-commit.
   * Si el clon falla, merge-tree clásico (stdout, sin --write-tree) y por último solape de diffs.
   */
  private async detectarConflictosMerge(
    repoPath: string,
    git: SimpleGit,
    ramaActual: string,
    sourceBranch: string,
    mergeBase: string,
    headHash: string,
    sourceHead: string,
  ): Promise<string[]> {
    try {
      return await ejecutarEnClonTemporal(repoPath, async (sandbox) => {
        const gitSandbox = simpleGit(sandbox);
        await gitSandbox.addConfig('user.email', 'preview@abyssan.local');
        await gitSandbox.addConfig('user.name', 'Abyssan Preview');
        // El clon solo materializa la rama por defecto; las demás quedan como origin/*.
        // Merge por hash para no depender de refs locales.
        await gitSandbox.raw(['checkout', '-f', headHash]);
        try {
          await gitSandbox.raw(['merge', '--no-commit', '--no-ff', sourceHead]);
        } catch {
          // conflictos: el índice del sandbox queda en MERGE; el origen no se toca
        }
        const unmerged = new Set<string>();
        const status = await gitSandbox.status();
        for (const f of status.conflicted ?? []) unmerged.add(f);
        try {
          const crudo = await gitSandbox.raw(['ls-files', '-u', '-z']);
          for (const linea of crudo.split('\0')) {
            const partes = linea.split('\t');
            const archivo = partes[partes.length - 1]?.trim();
            if (archivo) unmerged.add(archivo);
          }
        } catch {
          // ls-files no disponible
        }
        return [...unmerged];
      });
    } catch {
      try {
        const clasico = await git.raw(['merge-tree', mergeBase, ramaActual, sourceBranch]);
        const deTree = extraerConflictosMergeTree(clasico);
        if (deTree.length > 0) return deTree;
      } catch (err: unknown) {
        const salida = err instanceof Error ? err.message : '';
        const deTree = extraerConflictosMergeTree(salida);
        if (deTree.length > 0) return deTree;
      }
      return this.estimarConflictosPorSolape(git, ramaActual, sourceBranch, mergeBase);
    }
  }

  async previewMerge(repoPath: string, sourceBranch: string): Promise<PreviewResultado> {
    const start = Date.now();
    const git = this.getGitInstance(repoPath);
    const advertencias: string[] = [];
    const gitDir = path.join(repoPath, '.git');
    const enMerge = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
    const enRebase =
      fs.existsSync(path.join(gitDir, 'rebase-apply')) || fs.existsSync(path.join(gitDir, 'rebase-merge'));

    let estadoActual: EstadoRefPreview = { head: '' };
    let estadoObjetivo: EstadoRefPreview = { rama: sourceBranch, head: '' };
    try {
      estadoActual = await this.describirRef(git, 'HEAD');
      estadoObjetivo = await this.describirRef(git, sourceBranch);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'ref no resoluble';
      this.logRepository.addLog('git preview merge', Date.now() - start, true);
      return this.crearPreview('merge', repoPath, estadoActual, estadoObjetivo, {
        seguroEjecutar: false,
        advertencias: [`No se pudo resolver la ref «${sourceBranch}».`],
        explicacion: `No se puede fusionar: ${mensaje}`,
      });
    }

    const status = await git.status();
    const ramaActual = status.current || 'HEAD';
    if (status.files.length > 0) {
      advertencias.push('Hay cambios sin commitear que podrían interferir con el merge.');
    }
    if (enMerge) {
      advertencias.push('El repositorio ya está en medio de un merge. Termínalo o aborta antes de fusionar otra rama.');
    }
    if (enRebase) {
      advertencias.push('El repositorio está en rebase. Termínalo o aborta antes de fusionar.');
    }
    if (estadoActual.rama && estadoActual.rama === sourceBranch) {
      this.logRepository.addLog('git preview merge', Date.now() - start, true);
      return this.crearPreview('merge', repoPath, estadoActual, estadoObjetivo, {
        seguroEjecutar: false,
        advertencias,
        explicacion: `No se puede fusionar «${sourceBranch}» sobre sí misma.`,
      });
    }

    let mergeBase: string;
    try {
      mergeBase = (await git.raw(['merge-base', ramaActual, sourceBranch])).trim();
    } catch {
      this.logRepository.addLog('git preview merge', Date.now() - start, true);
      return this.crearPreview('merge', repoPath, { ...estadoActual }, estadoObjetivo, {
        seguroEjecutar: false,
        advertencias: [
          ...advertencias,
          `No se encontró ancestro común entre ${ramaActual} y ${sourceBranch}.`,
        ],
        explicacion: 'No se puede hacer merge: sin ancestro común.',
      });
    }
    estadoActual = { ...estadoActual, rama: estadoActual.rama ?? ramaActual, base: mergeBase };

    const posiblesConflictos = (enMerge || enRebase)
      ? []
      : await this.detectarConflictosMerge(
        repoPath,
        git,
        ramaActual,
        sourceBranch,
        mergeBase,
        estadoActual.head,
        estadoObjetivo.head,
      );

    if (posiblesConflictos.length > 0) {
      advertencias.push(`${posiblesConflictos.length} archivo(s) en conflicto requieren resolución manual.`);
    }

    const commitsAfectados = await this.obtenerCommitsEntre(git, ramaActual, sourceBranch);

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${ramaActual}...${sourceBranch}`]);
      const setConflictos = new Set(posiblesConflictos);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat).map((a) =>
        setConflictos.has(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    } catch { /* sin detalle de archivos */ }

    const explicacion = posiblesConflictos.length > 0
      ? `Fusionar ${sourceBranch} en ${ramaActual} incorporaría ${commitsAfectados.length} commit(s) y dejaría ${posiblesConflictos.length} conflicto(s) para resolver a mano.`
      : `Fusionar ${sourceBranch} en ${ramaActual} incorporaría ${commitsAfectados.length} commit(s) sobre el HEAD actual, sin conflictos detectados.`;

    const resultado = this.crearPreview('merge', repoPath, estadoActual, estadoObjetivo, {
      commitsAfectados,
      archivosAfectados,
      posiblesConflictos,
      advertencias,
      seguroEjecutar: !enMerge && !enRebase,
      explicacion,
    });
    this.logRepository.addLog('git preview merge', Date.now() - start, true);
    return resultado;
  }

  async previewReset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<PreviewResultado> {
    const git = this.getGitInstance(repoPath);
    const advertencias: string[] = [];
    const estadoActual = await this.describirRef(git, 'HEAD');
    const estadoObjetivo = await this.describirRef(git, target);

    if (estadoActual.head === estadoObjetivo.head) {
      return this.crearPreview('reset', repoPath, estadoActual, estadoObjetivo, {
        seguroEjecutar: true,
        explicacion: `HEAD ya apunta a ${target.substring(0, 7)}. El reset no tendrá efecto.`,
      });
    }

    const commitsPerdidos = await this.obtenerCommitsEntre(git, estadoObjetivo.head, estadoActual.head);

    if (type === 'hard') {
      advertencias.push('reset --hard descarta todos los cambios del working tree y staging. Esta operación es destructiva.');
      const status = await git.status();
      if (status.files.length > 0) {
        advertencias.push(`${status.files.length} archivo(s) con cambios locales serán descartados permanentemente.`);
      }
    } else if (type === 'mixed') {
      advertencias.push('reset --mixed mueve los cambios de los commits al working tree (unstaged).');
    } else {
      advertencias.push('reset --soft mantiene todos los cambios en staging.');
    }

    if (commitsPerdidos.length > 0) {
      advertencias.push(`${commitsPerdidos.length} commit(s) dejarán de ser alcanzables desde HEAD (recuperables vía reflog).`);
    }

    try {
      const remoteBranches = await git.raw(['branch', '-r', '--contains', estadoActual.head]);
      if (remoteBranches.trim()) {
        advertencias.push('Algunos commits ya están en el remoto; un push posterior requerirá --force.');
      }
    } catch { /* sin info de remoto */ }

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${estadoObjetivo.head}..${estadoActual.head}`]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat);
    } catch { /* sin detalle */ }

    return this.crearPreview('reset', repoPath, estadoActual, estadoObjetivo, {
      commitsAfectados: commitsPerdidos,
      archivosAfectados,
      advertencias,
      seguroEjecutar: true,
      explicacion: `Reset --${type} a ${target.substring(0, 7)}: ${commitsPerdidos.length} commit(s) retrocedidos, ${archivosAfectados.length} archivo(s) afectados.`,
    });
  }

  async previewCherryPick(repoPath: string, hash: string): Promise<PreviewResultado> {
    const git = this.getGitInstance(repoPath);
    const advertencias: string[] = [];
    const estadoActual = await this.describirRef(git, 'HEAD');
    const estadoObjetivo = await this.describirRef(git, hash);

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

    let archivosAfectados: ArchivoAfectadoPreview[] = [];
    try {
      const numstat = await git.raw(['diff', '--numstat', `${hash}~1`, hash]);
      archivosAfectados = this.parsearArchivosDeNumstat(numstat);
    } catch { /* sin detalle */ }

    const posiblesConflictos: string[] = [];
    try {
      const archivosCommit = new Set(archivosAfectados.map((a) => a.path));
      const status = await git.status();
      for (const f of status.modified) {
        if (archivosCommit.has(f)) posiblesConflictos.push(f);
      }
      const headDiff = await git.raw(['diff', '--name-only', 'HEAD']);
      for (const f of headDiff.trim().split('\n').filter(Boolean)) {
        if (archivosCommit.has(f) && !posiblesConflictos.includes(f)) posiblesConflictos.push(f);
      }
    } catch { /* sin estimación */ }

    if (posiblesConflictos.length > 0) {
      advertencias.push(`${posiblesConflictos.length} archivo(s) podrían generar conflictos.`);
      archivosAfectados = archivosAfectados.map((a) =>
        posiblesConflictos.includes(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    }

    const status = await git.status();
    if (status.files.length > 0) {
      advertencias.push('Hay cambios sin commitear que podrían interferir.');
    }

    return this.crearPreview('cherry-pick', repoPath, estadoActual, estadoObjetivo, {
      commitsAfectados: commitInfo,
      archivosAfectados,
      posiblesConflictos,
      advertencias,
      seguroEjecutar: true,
      explicacion: `Cherry-pick de ${hash.substring(0, 7)}: ${archivosAfectados.length} archivo(s) afectados.`,
    });
  }

  async previewRevert(repoPath: string, hash: string): Promise<PreviewResultado> {
    const git = this.getGitInstance(repoPath);
    const advertencias: string[] = [];
    const estadoActual = await this.describirRef(git, 'HEAD');
    const estadoObjetivo = await this.describirRef(git, hash);

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
      advertencias.push('El commit es un merge commit; revert de merges puede tener efectos inesperados.');
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

    const posiblesConflictos: string[] = [];
    try {
      const archivosRevert = new Set(archivosAfectados.map((a) => a.path));
      const diffSinceCommit = await git.raw(['diff', '--name-only', hash, 'HEAD']);
      for (const f of diffSinceCommit.trim().split('\n').filter(Boolean)) {
        if (archivosRevert.has(f)) posiblesConflictos.push(f);
      }
    } catch { /* sin estimación */ }

    if (posiblesConflictos.length > 0) {
      advertencias.push(`${posiblesConflictos.length} archivo(s) modificados después del commit podrían generar conflictos.`);
      archivosAfectados = archivosAfectados.map((a) =>
        posiblesConflictos.includes(a.path) ? { ...a, tipo: 'conflicto' as const } : a
      );
    }

    return this.crearPreview('revert', repoPath, estadoActual, estadoObjetivo, {
      commitsAfectados: commitInfo,
      archivosAfectados,
      posiblesConflictos,
      advertencias,
      seguroEjecutar: true,
      explicacion: `Revert de ${hash.substring(0, 7)}: ${archivosAfectados.length} archivo(s) afectados, creará un nuevo commit.`,
    });
  }
}

import type { TipoOperacion } from './tiposJournal.js';

function corto(hash?: string): string {
  if (!hash) return '';
  return hash.length > 7 ? hash.substring(0, 7) : hash;
}

export function comandoGitDeOperacion(tipo: TipoOperacion, payload: Record<string, string>): string {
  switch (tipo) {
    case 'commit':
      return payload.hashAnterior
        ? `git reset --soft ${corto(payload.hashAnterior)}`
        : 'git reset --soft HEAD~1';
    case 'crearRama':
      return `git branch -d ${payload.rama ?? ''}`;
    case 'borrarRama':
      return payload.hash
        ? `git branch ${payload.rama} ${corto(payload.hash)}`
        : `git branch ${payload.rama ?? ''}`;
    case 'renombrarRama':
      return `git branch -m ${payload.nombreNuevo} ${payload.nombreActual}`;
    case 'checkout':
      return `git checkout ${payload.anterior ?? ''}`;
    case 'discard':
      return payload.filePath
        ? `git restore --worktree -- ${payload.filePath}`
        : 'git restore --worktree';
    case 'reset':
      return payload.hashAnterior
        ? `git reset --${payload.type || 'hard'} ${corto(payload.hashAnterior)}`
        : `git reset --${payload.type || 'hard'}`;
    case 'merge':
      return payload.sourceBranch ? `git merge ${payload.sourceBranch}` : 'git merge';
    case 'pull':
      return payload.modo === 'rebase' ? 'git pull --rebase' : 'git pull';
    case 'push':
      return 'git push';
    case 'amend':
      return 'git commit --amend';
    case 'clone':
      return 'git clone';
    case 'init':
      return 'git init';
    case 'cherry-pick':
      return payload.hash ? `git cherry-pick ${corto(payload.hash)}` : 'git cherry-pick';
    case 'revert':
      return payload.hash ? `git revert ${corto(payload.hash)}` : 'git revert';
    default:
      return `git ${tipo}`;
  }
}

export function estadoAnteriorDeOperacion(
  tipo: TipoOperacion,
  payload: Record<string, string>,
  archivosSnapshot = 0
): string {
  switch (tipo) {
    case 'commit':
      return payload.hashAnterior
        ? `HEAD estaba en ${corto(payload.hashAnterior)}`
        : 'Repositorio sin commit previo';
    case 'crearRama':
      return payload.anterior
        ? `Sin la rama ${payload.rama}; HEAD en ${payload.anterior}`
        : `Sin la rama ${payload.rama ?? ''}`;
    case 'borrarRama':
      return payload.hash
        ? `Rama ${payload.rama} apuntaba a ${corto(payload.hash)}`
        : `Rama ${payload.rama ?? ''} existía`;
    case 'renombrarRama':
      return `La rama se llamaba ${payload.nombreActual}`;
    case 'checkout':
      return payload.anterior ? `HEAD en ${payload.anterior}` : 'Sin rama previa';
    case 'discard':
      return payload.filePath
        ? `Working tree con cambios en ${payload.filePath}`
        : 'Working tree con el archivo sucio';
    case 'reset':
      return archivosSnapshot > 0
        ? `HEAD en ${corto(payload.hashAnterior)}; ${archivosSnapshot} archivo(s) sucio(s) en snapshot`
        : `HEAD en ${corto(payload.hashAnterior)}`;
    case 'merge':
      return 'Antes del merge';
    case 'pull':
      return 'Antes del pull';
    case 'push':
      return 'Commits locales aún no publicados';
    case 'amend':
      return payload.hash ? `Commit ${corto(payload.hash)} antes del amend` : 'Mensaje de commit anterior';
    case 'clone':
      return 'La carpeta de destino no existía';
    case 'init':
      return 'Directorio sin repositorio git';
    case 'cherry-pick':
      return payload.hash ? `Antes de cherry-pick de ${corto(payload.hash)}` : 'Antes del cherry-pick';
    case 'revert':
      return payload.hash ? `Antes de revert de ${corto(payload.hash)}` : 'Antes del revert';
    default:
      return 'Estado previo a la operación';
  }
}

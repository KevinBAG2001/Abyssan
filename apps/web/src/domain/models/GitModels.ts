// Austria: Modelos y Entidades de Dominio en Frontend (DDD)

export interface CommitModel {
  hash: string;
  shortHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  refs?: string[];
  branches?: string[];
  tags?: string[];
  column?: number;
  color?: string;
}

export interface BranchModel {
  name: string;
  current: boolean;
  commit: string;
  label?: string;
  isRemote?: boolean;
}

export interface RemoteModel {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface TagModel {
  name: string;
  hash: string;
}

export interface StashModel {
  index: number;
  message: string;
  hash: string;
  date: string;
}

export interface FileStatusModel {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
}

export interface RepositoryStatusModel {
  currentBranch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  files: FileStatusModel[];
  tracking?: string;
  isMerging?: boolean;
  isRebasing?: boolean;
}

export interface RepositorySummaryModel {
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
}

export interface HunkConflictoModel {
  actual: string;
  entrante: string;
  encabezadoActual: string;
  encabezadoEntrante: string;
}

export interface ConflictModel {
  filePath: string;
  currentContent: string;
  incomingContent: string;
  baseContent: string;
  rawConflict: string;
  baseDisponible?: boolean;
  hunks?: HunkConflictoModel[];
}

export interface BranchComparisonModel {
  baseBranch: string;
  targetBranch: string;
  aheadCount: number;
  behindCount: number;
  commits: CommitModel[];
  diffSummary: string;
}

export interface CommandLogModel {
  id: string;
  timestamp: string;
  command: string;
  durationMs: number;
  success: boolean;
  output?: string;
  error?: string;
}

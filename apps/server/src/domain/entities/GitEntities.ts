// Austria: Entidades y Objetos de Valor del Dominio Git (DDD Core)

export interface CommitEntity {
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

export interface BranchEntity {
  name: string;
  current: boolean;
  commit: string;
  label?: string;
  isRemote?: boolean;
}

export interface RemoteEntity {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface TagEntity {
  name: string;
  hash: string;
}

export interface StashEntity {
  index: number;
  message: string;
  hash: string;
  date: string;
}

export interface FileChangeEntity {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
}

export interface RepositoryStatusEntity {
  currentBranch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  files: FileChangeEntity[];
  tracking?: string;
  isMerging?: boolean;
  isRebasing?: boolean;
}

export interface RepositorySummaryEntity {
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
}

export interface ConflictEntity {
  filePath: string;
  currentContent: string;
  incomingContent: string;
  baseContent: string;
  rawConflict: string;
}

export interface BranchComparisonEntity {
  baseBranch: string;
  targetBranch: string;
  aheadCount: number;
  behindCount: number;
  commits: CommitEntity[];
  diffSummary: string;
}

export interface CommandLogEntity {
  id: string;
  timestamp: string;
  command: string;
  durationMs: number;
  success: boolean;
  output?: string;
  error?: string;
}

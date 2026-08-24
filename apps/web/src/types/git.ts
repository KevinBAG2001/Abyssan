export interface GitCommit {
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

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label?: string;
  isRemote?: boolean;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitTag {
  name: string;
  hash: string;
}

export interface GitStash {
  index: number;
  message: string;
  hash: string;
  date: string;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
}

export interface GitRepoStatus {
  currentBranch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  tracking?: string;
  isMerging?: boolean;
  isRebasing?: boolean;
}

export interface GitRepoSummary {
  name: string;
  path: string;
  isGitRepo: boolean;
  currentBranch?: string;
}

export interface GitConflictData {
  filePath: string;
  currentContent: string;
  incomingContent: string;
  baseContent: string;
  rawConflict: string;
}

export interface GitBranchComparison {
  baseBranch: string;
  targetBranch: string;
  aheadCount: number;
  behindCount: number;
  commits: GitCommit[];
  diffSummary: string;
}

export interface GitCommandLog {
  id: string;
  timestamp: string;
  command: string;
  durationMs: number;
  success: boolean;
  output?: string;
  error?: string;
}

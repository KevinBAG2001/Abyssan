import {
  GitCommit,
  GitBranch,
  GitRepoStatus,
  GitRepoSummary,
  GitStash,
  GitTag,
  GitRemote,
  GitBranchComparison,
  GitConflictData,
  GitCommandLog,
} from '../types/git';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async getRepos(root?: string): Promise<GitRepoSummary[]> {
    const url = root ? `${API_BASE}/api/git/repos?root=${encodeURIComponent(root)}` : `${API_BASE}/api/git/repos`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async getStatus(repoPath: string): Promise<GitRepoStatus> {
    const res = await fetch(`${API_BASE}/api/git/status?path=${encodeURIComponent(repoPath)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async getCommits(repoPath: string, limit = 150): Promise<GitCommit[]> {
    const res = await fetch(`${API_BASE}/api/git/commits?path=${encodeURIComponent(repoPath)}&limit=${limit}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async getBranches(repoPath: string): Promise<GitBranch[]> {
    const res = await fetch(`${API_BASE}/api/git/branches?path=${encodeURIComponent(repoPath)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async compareBranches(repoPath: string, baseBranch: string, targetBranch: string): Promise<GitBranchComparison> {
    const res = await fetch(
      `${API_BASE}/api/git/branches/compare?path=${encodeURIComponent(repoPath)}&base=${encodeURIComponent(
        baseBranch
      )}&target=${encodeURIComponent(targetBranch)}`
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async merge(repoPath: string, sourceBranch: string, noFf = false): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, sourceBranch, noFf }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async getDiff(repoPath: string, file?: string, staged = false): Promise<string> {
    let url = `${API_BASE}/api/git/diff?path=${encodeURIComponent(repoPath)}&staged=${staged}`;
    if (file) {
      url += `&file=${encodeURIComponent(file)}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async stage(repoPath: string, file?: string, all = false): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, file, all }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async unstage(repoPath: string, file: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/unstage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, file }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async commit(repoPath: string, message: string, description?: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/git/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, message, description }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data.hash;
  },

  async checkout(repoPath: string, target: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, target }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, branchName, startPoint }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async pull(repoPath: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async push(repoPath: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Remotos
  async getRemotes(repoPath: string): Promise<GitRemote[]> {
    const res = await fetch(`${API_BASE}/api/git/remotes?path=${encodeURIComponent(repoPath)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/remote/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, name, url }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async removeRemote(repoPath: string, name: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/remote/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, name }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async fetchAll(repoPath: string, prune = true): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, prune }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Stashes
  async getStashes(repoPath: string): Promise<GitStash[]> {
    const res = await fetch(`${API_BASE}/api/git/stashes?path=${encodeURIComponent(repoPath)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async saveStash(repoPath: string, message?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/stash/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, message }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async popStash(repoPath: string, index = 0): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/stash/pop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, index }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async dropStash(repoPath: string, index = 0): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/stash/drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, index }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Tags
  async getTags(repoPath: string): Promise<GitTag[]> {
    const res = await fetch(`${API_BASE}/api/git/tags?path=${encodeURIComponent(repoPath)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async createTag(repoPath: string, tagName: string, targetHash?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, tagName, targetHash }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Cherry-Pick, Revert, Reset
  async cherryPick(repoPath: string, hash: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/cherry-pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, hash }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async revert(repoPath: string, hash: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, hash }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  async reset(repoPath: string, type: 'soft' | 'mixed' | 'hard', target: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, type, target }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Conflictos
  async getConflict(repoPath: string, file: string): Promise<GitConflictData> {
    const res = await fetch(
      `${API_BASE}/api/git/conflict?path=${encodeURIComponent(repoPath)}&file=${encodeURIComponent(file)}`
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async resolveConflict(repoPath: string, file: string, resolvedContent: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/git/conflict/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, file, resolvedContent }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },

  // Logs
  async getLogs(): Promise<GitCommandLog[]> {
    const res = await fetch(`${API_BASE}/api/git/logs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
};

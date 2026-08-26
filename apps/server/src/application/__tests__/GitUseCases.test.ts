import { describe, it, expect } from 'vitest';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../use-cases/GitUseCases.js';

describe('GitUseCases y adaptadores DDD', () => {
  const logAdapter = new InMemoryCommandLogAdapter();
  const gitAdapter = new SimpleGitAdapter(logAdapter);
  const gitUseCases = new GitUseCases(gitAdapter, logAdapter);

  it('debe registrar y recuperar logs a través del adaptador de auditoría', () => {
    logAdapter.addLog('git status', 15, true, 'clean');
    const logs = logAdapter.getRecentLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].command).toBe('git status');
  });

  it('debe verificar que una ruta inexistente no es un repositorio git', async () => {
    const isGit = await gitAdapter.isGitRepository('C:\\ruta_inexistente_12345');
    expect(isGit).toBe(false);
  });

  it('debe retornar lista vacía al consultar directorios inválidos', async () => {
    const repos = await gitUseCases.listRepositories('C:\\ruta_inexistente_12345');
    expect(repos).toEqual([]);
  });
});

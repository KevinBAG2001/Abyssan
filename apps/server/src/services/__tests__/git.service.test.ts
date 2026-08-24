// Austria: Pruebas unitarias de arquitectura DDD en Backend con Vitest
import { describe, it, expect } from 'vitest';
import { SimpleGitAdapter } from '../../infrastructure/git/SimpleGitAdapter.js';
import { InMemoryCommandLogAdapter } from '../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../../application/use-cases/GitUseCases.js';

describe('Domain-Driven Design (DDD) Core Architecture Tests', () => {
  const logAdapter = new InMemoryCommandLogAdapter();
  const gitAdapter = new SimpleGitAdapter(logAdapter);
  const gitUseCases = new GitUseCases(gitAdapter, logAdapter);

  it('debe registrar y recuperar logs a traves del adaptador de auditoria', () => {
    logAdapter.addLog('git status', 15, true, 'clean');
    const logs = logAdapter.getRecentLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].command).toBe('git status');
  });

  it('debe verificar que una ruta inexistente retorne false en el caso de uso', async () => {
    const isGit = await gitAdapter.isGitRepository('C:\\ruta_inexistente_12345');
    expect(isGit).toBe(false);
  });

  it('debe retornar lista vacia al consultar directorios invalidos en el caso de uso', async () => {
    const repos = await gitUseCases.listRepositories('C:\\ruta_inexistente_12345');
    expect(repos).toEqual([]);
  });
});

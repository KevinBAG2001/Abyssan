import { describe, expect, it } from 'vitest';
import { InMemoryCommandLogAdapter } from '../InMemoryCommandLogAdapter.js';

describe('InMemoryCommandLogAdapter', () => {
  it('deja comandos normales intactos', () => {
    const logs = new InMemoryCommandLogAdapter();
    logs.addLog('git status --porcelain -uno', 12, true);
    expect(logs.getRecentLogs()[0]?.command).toBe('git status --porcelain -uno');
  });

  it('no expone token HTTPS en command ni error (SEC-001)', () => {
    const logs = new InMemoryCommandLogAdapter();
    logs.addLog(
      'git clone https://x-access-token:ghp_falsoNoUsar@github.com/acme/repo.git /tmp/x',
      8,
      false,
      undefined,
      "fatal: Authentication failed for 'https://x-access-token:ghp_falsoNoUsar@github.com/acme/repo.git'"
    );
    const entrada = logs.getRecentLogs()[0];
    expect(entrada?.command).not.toContain('ghp_falsoNoUsar');
    expect(entrada?.error).not.toContain('ghp_falsoNoUsar');
    expect(entrada?.command).toContain('https://***@');
  });
});

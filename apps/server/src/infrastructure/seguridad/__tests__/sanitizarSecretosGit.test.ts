import { describe, expect, it } from 'vitest';
import { sanitizarSecretosGit, sanitizarTextoAuditoria } from '../sanitizarSecretosGit.js';

describe('sanitizarSecretosGit', () => {
  it('redacta user:pass y token solo en URL', () => {
    expect(sanitizarSecretosGit('pull https://user:pass@github.com/o/r.git')).toContain('https://***@');
    expect(sanitizarSecretosGit('fetch https://ghp_falso123@github.com/o/r.git')).toContain('https://***@');
    expect(sanitizarSecretosGit('https://ghp_falso123@github.com/o/r.git')).not.toContain('ghp_falso123');
  });

  it('redacta prefijos de token conocidos sueltos', () => {
    const limpio = sanitizarSecretosGit(
      'Authorization Bearer gho_abc clone x-access-token:ghp_xyz en reflog'
    );
    expect(limpio).not.toMatch(/gho_abc/);
    expect(limpio).not.toMatch(/ghp_xyz/);
    expect(limpio).toContain('***');
  });

  it('recorta texto de auditoría', () => {
    const largo = 'a'.repeat(500);
    expect(sanitizarTextoAuditoria(largo).length).toBe(400);
  });

  it('protege reflog contaminado históricamente', () => {
    const reflog =
      'pull --no-rebase --progress https://x-access-token:ghp_FAKE123@github.com/u/r main: Fast-forward';
    const limpio = sanitizarSecretosGit(reflog);
    expect(limpio).not.toContain('ghp_FAKE123');
    expect(limpio).not.toContain('x-access-token:');
    expect(limpio).toContain('https://***@');
  });
});

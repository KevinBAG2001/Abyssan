import { describe, expect, it } from 'vitest';
import { construirEntornoAuthGitHttps } from '../entornoAuthGitHttps.js';

describe('entornoAuthGitHttps', () => {
  it('no incluye el token en valores de argv visibles (solo Basic codificado)', () => {
    const token = 'ghp_FAKE1234567890123456789012345678';
    const env = construirEntornoAuthGitHttps({
      urlPlana: 'https://github.com/acme/repo.git',
      forja: 'github',
      token,
    });
    expect(env.GIT_CONFIG_COUNT).toBe('2');
    expect(env.GIT_CONFIG_KEY_0).toContain('github.com');
    const header = env.GIT_CONFIG_VALUE_0 ?? '';
    expect(header).toMatch(/^Authorization: Basic /);
    expect(header).not.toContain(token);
    expect(env.GIT_CONFIG_VALUE_1).toBe('');
  });
});

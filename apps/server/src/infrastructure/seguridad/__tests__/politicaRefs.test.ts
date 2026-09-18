import { describe, expect, it } from 'vitest';
import { validarHashGit, validarRefGit, validarRefspecFetch } from '../politicaRefs.js';

describe('política de refs Git (SEC-REF-01)', () => {
  it('acepta ramas, tags, HEAD, SHA y refs completas', () => {
    expect(validarRefGit('main')).toBe('main');
    expect(validarRefGit('feature/auth')).toBe('feature/auth');
    expect(validarRefGit('origin/main')).toBe('origin/main');
    expect(validarRefGit('HEAD')).toBe('HEAD');
    expect(validarRefGit('v1.0.0')).toBe('v1.0.0');
    expect(validarRefGit('refs/heads/main')).toBe('refs/heads/main');
    expect(validarRefGit('refs/remotes/origin/main')).toBe('refs/remotes/origin/main');
    expect(validarHashGit('abc1234')).toBe('abc1234');
  });

  it('rechaza expresiones que el API no soporta', () => {
    expect(() => validarRefGit('HEAD~1')).toThrow('Ref Git');
    expect(() => validarRefGit('HEAD^')).toThrow('Ref Git');
    expect(() => validarRefGit('main^{}')).toThrow('Ref Git');
    expect(() => validarRefGit('HEAD@{1}')).toThrow('Ref Git');
    expect(() => validarRefGit('feature/*')).toThrow('Ref Git');
    expect(() => validarRefGit('main...otra')).toThrow('Ref Git');
    expect(() => validarRefGit('-uorigin')).toThrow('Ref Git');
  });

  it('acepta refspecs de forja y rechaza el resto', () => {
    expect(validarRefspecFetch('+pull/12/head:abyssan-pr-12')).toBe('+pull/12/head:abyssan-pr-12');
    expect(validarRefspecFetch('+merge-requests/3/head:abyssan-mr-3')).toContain('merge-requests');
    expect(validarRefspecFetch('develop')).toBe('develop');
    expect(() => validarRefspecFetch('+pull/x/head:evil')).toThrow();
    expect(() => validarRefspecFetch('HEAD~1:otro')).toThrow();
  });
});

import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';

/** Variables Git que simple-git v4 no pasa al hijo salvo allowlist explícita. */
const ENTORNO_GIT_PERMITIDO = [
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_CONFIG_COUNT',
  'GIT_TERMINAL_PROMPT',
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
  ...Array.from({ length: 8 }, (_, i) => [`GIT_CONFIG_KEY_${i}`, `GIT_CONFIG_VALUE_${i}`]).flat(),
] as const;

const OPCIONES_BASE: Pick<SimpleGitOptions, 'allowEnvironment' | 'unsafe'> = {
  allowEnvironment: [...ENTORNO_GIT_PERMITIDO],
  // Rutas vía GIT_CONFIG_* y escrituras acotadas de user.* / include (bootstrap Docker).
  unsafe: {
    allowUnsafeConfigPaths: true,
    allowUnsafeInclude: true,
    // Auth HTTPS vía GIT_CONFIG_COUNT + http.extraHeader (B1); no va en argv.
    allowUnsafeConfigEnvCount: true,
    allowUnsafeCredentialHelper: true,
  },
};

/** Opciones compartidas (p. ej. tests que envuelven simple-git). */
export const opcionesSimpleGitAbyssan = OPCIONES_BASE;

/** Instancia simple-git con entorno Git del host/contenedor (Docker, tests, CI). */
export function simpleGitAbyssan(
  baseDir?: string | Partial<SimpleGitOptions>,
  options?: Partial<SimpleGitOptions>,
): SimpleGit {
  if (typeof baseDir === 'string') {
    return simpleGit(baseDir, { ...OPCIONES_BASE, ...options });
  }
  return simpleGit({ ...OPCIONES_BASE, ...baseDir });
}

/** Credenciales embebidas: scheme://user:secret@ o scheme://token@ */
const USERINFO_EN_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^/\s]*@[^\s]*/gi;

const PATRONES_TOKEN =
  /(bearer\s+|token[=:]\s*|gho_|ghp_|glpat-|github_pat_|x-access-token:?)[^\s"']+/gi;

/**
 * Redacta tokens y credenciales en URLs en textos expuestos a API/UI/logs.
 */
export function sanitizarSecretosGit(texto: string): string {
  return texto
    .replace(USERINFO_EN_URL, (coincidencia) => {
      const esquema = coincidencia.match(/^[a-z][a-z0-9+.-]*:\/\//i)?.[0] ?? 'https://';
      return `${esquema}***@`;
    })
    .replace(PATRONES_TOKEN, '***');
}

/** Igual que sanitizarSecretosGit pero con límite de longitud para auditoría. */
export function sanitizarTextoAuditoria(texto: string): string {
  return sanitizarSecretosGit(texto).slice(0, 400);
}

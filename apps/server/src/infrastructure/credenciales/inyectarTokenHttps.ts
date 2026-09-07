export type ProveedorForja = 'github' | 'gitlab';

export function detectarForja(url: string): ProveedorForja | null {
  const recortada = url.trim();
  if (/github\.com[:/]/i.test(recortada)) return 'github';
  if (/gitlab\.com[:/]/i.test(recortada)) return 'gitlab';
  return null;
}

function hostForja(forja: ProveedorForja): string {
  return forja === 'github' ? 'github.com' : 'gitlab.com';
}

/**
 * Normaliza origin SSH/HTTPS de GitHub o GitLab a HTTPS sin credenciales.
 * No inyecta tokens.
 */
export function urlHttpsDeRemoto(url: string): string | null {
  const recortada = url.trim();
  const forja = detectarForja(recortada);
  if (!forja) return null;
  const host = hostForja(forja);

  const scp = recortada.match(/^git@([^:]+):(.+)$/i);
  if (scp) {
    return `https://${host}/${scp[2].replace(/^\/+/, '')}`;
  }

  const ssh = recortada.match(/^ssh:\/\/git@([^/]+)\/(.+)$/i);
  if (ssh) {
    return `https://${host}/${ssh[2]}`;
  }

  try {
    const parsed = new URL(recortada.replace(/^ssh:\/\//i, 'https://'));
    if (parsed.protocol !== 'https:') return null;
    parsed.username = '';
    parsed.password = '';
    parsed.host = host;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Inyecta el token OAuth en una URL HTTPS. No usar el resultado en logs.
 */
export function inyectarTokenHttps(
  url: string,
  token: string,
  forja: ProveedorForja
): string {
  const https = url.startsWith('https://') ? url : urlHttpsDeRemoto(url);
  if (!https || !https.startsWith('https://')) return url;
  const parsed = new URL(https);
  if (forja === 'github') {
    parsed.username = 'x-access-token';
    parsed.password = token;
  } else {
    parsed.username = 'oauth2';
    parsed.password = token;
  }
  return parsed.toString();
}

export function tokenForjaDesdeEntorno(forja: ProveedorForja): string | undefined {
  const crudo =
    forja === 'github' ? process.env.ABYSSAN_GITHUB_TOKEN : process.env.ABYSSAN_GITLAB_TOKEN;
  const token = crudo?.trim();
  return token || undefined;
}

export function forjaOAuthConfigurada(forja: ProveedorForja): boolean {
  if (forja === 'github') {
    return Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim());
  }
  return Boolean(process.env.GITLAB_CLIENT_ID?.trim() && process.env.GITLAB_CLIENT_SECRET?.trim());
}

export function mensajePushSinCredencial(forja: ProveedorForja): string {
  const nombre = forja === 'github' ? 'GitHub' : 'GitLab';
  const varPat = forja === 'github' ? 'ABYSSAN_GITHUB_TOKEN' : 'ABYSSAN_GITLAB_TOKEN';
  if (forjaOAuthConfigurada(forja)) {
    return (
      `Push a ${nombre} no tiene sesión en este server. ` +
      `Abre PRs → Conectar ${nombre} y vuelve a pulsar Push.`
    );
  }
  return (
    `Docker no usa las credenciales de Git de Windows. ` +
    `Para publicar: conecta ${nombre} en PRs (añade CLIENT_ID/SECRET al .env y recrea el server) ` +
    `o define ${varPat} (PAT con permiso de repo) y recrea el server.`
  );
}

import type { ProveedorForja } from './inyectarTokenHttps.js';
import { urlHttpsDeRemoto } from './inyectarTokenHttps.js';

export type CredencialHttpsGit = {
  urlPlana: string;
  forja: ProveedorForja;
  token: string;
};

function urlHttpsSinCredenciales(url: string): string | null {
  const https = url.startsWith('https://') ? url : urlHttpsDeRemoto(url);
  if (!https?.startsWith('https://')) return null;
  const parsed = new URL(https);
  parsed.username = '';
  parsed.password = '';
  return parsed.toString();
}

function usuarioPasswordAuth(forja: ProveedorForja, token: string): { user: string; pass: string } {
  if (forja === 'github') {
    return { user: 'x-access-token', pass: token };
  }
  return { user: 'oauth2', pass: token };
}

/**
 * Variables de entorno para autenticar HTTPS sin incrustar el token en la URL ni en argv.
 * Usa http.extraHeader acotado al host del remoto y desactiva credential.helper.
 */
export function construirEntornoAuthGitHttps(cred: CredencialHttpsGit): NodeJS.ProcessEnv {
  const https = urlHttpsSinCredenciales(cred.urlPlana);
  if (!https) {
    return { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  }
  const parsed = new URL(https);
  const seccion = `http.${parsed.protocol}//${parsed.host}/.extraHeader`;
  const { user, pass } = usuarioPasswordAuth(cred.forja, cred.token);
  const basic = Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');

  const keys = [seccion, 'credential.helper'];
  const values = [`Authorization: Basic ${basic}`, ''];

  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: String(keys.length) };
  keys.forEach((key, i) => {
    env[`GIT_CONFIG_KEY_${i}`] = key;
    env[`GIT_CONFIG_VALUE_${i}`] = values[i] ?? '';
  });
  return env;
}

export function credencialHttpsDesdeUrl(
  url: string,
  forja: ProveedorForja,
  token: string
): CredencialHttpsGit | undefined {
  const urlPlana = urlHttpsSinCredenciales(url);
  if (!urlPlana) return undefined;
  return { urlPlana, forja, token };
}

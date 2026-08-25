export type ProveedorForja = 'github' | 'gitlab';

export function detectarForja(url: string): ProveedorForja | null {
  const recortada = url.trim();
  if (/github\.com[:/]/i.test(recortada)) return 'github';
  if (/gitlab\.com[:/]/i.test(recortada)) return 'gitlab';
  return null;
}

/**
 * Inyecta el token OAuth en una URL HTTPS. No usar el resultado en logs.
 */
export function inyectarTokenHttps(
  url: string,
  token: string,
  forja: ProveedorForja
): string {
  if (!url.startsWith('https://')) return url;
  const parsed = new URL(url);
  if (forja === 'github') {
    parsed.username = 'x-access-token';
    parsed.password = token;
  } else {
    parsed.username = 'oauth2';
    parsed.password = token;
  }
  return parsed.toString();
}

import { detectarForja, type ProveedorForja } from '../credenciales/inyectarTokenHttps.js';

export type OriginForja = {
  proveedor: ProveedorForja;
  propietario: string;
  repositorio: string;
  /** owner/repo (GitHub) o path URL-encoded (GitLab, admite subgrupos). */
  idApi: string;
};

/**
 * Extrae propietario/repo de una URL origin (HTTPS o SSH).
 */
export function parsearOriginForja(url: string): OriginForja | null {
  if (!url?.trim()) return null;
  const proveedor = detectarForja(url);
  if (!proveedor) return null;

  let ruta = '';
  const ssh = url.trim().match(/^git@[^:]+:(.+)$/i);
  if (ssh) {
    ruta = ssh[1];
  } else {
    try {
      const normalizada = url.trim().replace(/^ssh:\/\//i, 'https://');
      const parsed = new URL(normalizada);
      ruta = parsed.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  ruta = ruta.replace(/\.git$/i, '').replace(/\/+$/, '');
  const partes = ruta.split('/').filter(Boolean);
  if (partes.length < 2) return null;

  const repositorio = partes[partes.length - 1];
  const propietario = partes.slice(0, -1).join('/');
  const idPlano = `${propietario}/${repositorio}`;

  return {
    proveedor,
    propietario,
    repositorio,
    idApi: proveedor === 'gitlab' ? encodeURIComponent(idPlano) : idPlano,
  };
}

export function elegirUrlOrigin(
  remotes: { name: string; fetchUrl: string; pushUrl: string }[]
): string | undefined {
  const origin = remotes.find((r) => r.name === 'origin');
  const elegido = origin ?? remotes[0];
  return elegido?.fetchUrl || elegido?.pushUrl;
}

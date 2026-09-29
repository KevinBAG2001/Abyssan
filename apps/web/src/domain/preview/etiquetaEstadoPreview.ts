import type { EstadoRefPreview } from '../models/GitModels';

export function cortoHash(hash: string): string {
  if (!hash) return '—';
  return hash.length > 7 ? hash.slice(0, 7) : hash;
}

export function etiquetaEstadoPreview(estado: EstadoRefPreview): string {
  const hash = cortoHash(estado.head);
  const nombre = estado.rama || 'HEAD';
  if (estado.base) {
    return `${nombre} @ ${hash} · base ${cortoHash(estado.base)}`;
  }
  return `${nombre} @ ${hash}`;
}

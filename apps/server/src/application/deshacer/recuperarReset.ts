import type { IGitRepository } from '../../domain/repositories/IGitRepository.js';
import { validarRefRecuperacion } from '../../infrastructure/seguridad/politicaRefs.js';
import type { EntradaJournal } from './tiposJournal.js';

type GitRecuperacion = Pick<
  IGitRepository,
  'reset' | 'obtenerHashHead' | 'resolverRefRecuperacion' | 'borrarRefRecuperacion'
>;

/**
 * Restaura HEAD de un reset usando la ref anclada en el repositorio.
 * Si la ref no existe, no se usa el hash guardado en el journal como sustituto.
 */
export async function recuperarReset(
  git: GitRecuperacion,
  repoPath: string,
  op: EntradaJournal,
  restaurar: (snapshotId: string) => void
): Promise<void> {
  const info = op.recuperacion;
  if (!info?.ref || info.estrategia !== 'ref_temporal' || !info.disponible) {
    throw new Error(
      'Este reset no tiene una ref de recuperación en el repositorio. No se restaura HEAD desde un hash guardado.'
    );
  }

  const ref = validarRefRecuperacion(info.ref);
  const anclado = await git.resolverRefRecuperacion(repoPath, ref);
  const esperado = info.hash?.trim().toLowerCase() || '';

  if (!anclado) {
    if (esperado) {
      const head = (await git.obtenerHashHead(repoPath)).trim().toLowerCase();
      if (head === esperado) return;
    }
    throw new Error(
      'La ref de recuperación ya no está en el repositorio. No se restaura HEAD desde el hash guardado en el journal.'
    );
  }

  if (esperado && anclado !== esperado) {
    throw new Error('La ref de recuperación no coincide con el HEAD registrado. La recuperación se aborta.');
  }

  const modo = op.payload.type === 'hard' ? 'hard' : 'soft';
  await git.reset(repoPath, modo, ref);
  if (modo === 'hard' && op.snapshotId) {
    restaurar(op.snapshotId);
  }
  await git.borrarRefRecuperacion(repoPath, ref);
}

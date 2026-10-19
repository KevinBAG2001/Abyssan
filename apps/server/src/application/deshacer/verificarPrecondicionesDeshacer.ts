import type { IGitRepository } from '../../domain/repositories/IGitRepository.js';
import type { EntradaJournal, TipoOperacion } from './tiposJournal.js';

type GitEstado = Pick<IGitRepository, 'getStatus' | 'obtenerHashHead'>;

const TIPOS_CON_HEAD: ReadonlySet<TipoOperacion> = new Set([
  'commit',
  'reset',
  'discard',
  'borrarRama',
  'crearRama',
  'renombrarRama',
  'checkout',
]);

function normalizarRama(rama: string | undefined | null): string | undefined {
  if (!rama || rama === 'HEAD desvinculado') return undefined;
  return rama;
}

function hashValido(hash: string | undefined): string | undefined {
  const h = hash?.trim().toLowerCase();
  if (h && /^[0-9a-f]{40}$/.test(h)) return h;
  return undefined;
}

/** HEAD esperado tras la operación (hashNuevo / despues.head). */
export function headEsperadoTrasOperacion(op: EntradaJournal): string | undefined {
  const directo = hashValido(op.despues?.head) ?? hashValido(op.payload.hashNuevo);
  if (directo) return directo;
  if (op.tipo === 'reset') {
    return hashValido(op.payload.target);
  }
  return undefined;
}

/** Rama activa esperada tras la operación. Entradas antiguas pueden no tener `despues.rama`. */
export function ramaEsperadaTrasOperacion(op: EntradaJournal): string | undefined {
  const deDespues = normalizarRama(op.despues?.rama);
  if (deDespues) return deDespues;
  switch (op.tipo) {
    case 'checkout':
      return normalizarRama(op.payload.destino);
    case 'crearRama':
      return normalizarRama(op.payload.rama);
    case 'renombrarRama':
      return normalizarRama(op.payload.nombreNuevo);
    default:
      return normalizarRama(op.payload.rama);
  }
}

/**
 * Comprueba que el repo sigue en la rama y el commit registrados al hacer la operación.
 * Entradas antiguas sin rama persistida: solo se exige coincidencia de HEAD cuando hay ancla;
 * si falta rama en el journal no se compara rama (documentado en tests).
 */
export async function verificarPrecondicionesDeshacer(
  git: GitEstado,
  repoPath: string,
  op: EntradaJournal
): Promise<void> {
  const headActual = hashValido(await git.obtenerHashHead(repoPath));
  const status = await git.getStatus(repoPath);
  const ramaActual = normalizarRama(status.currentBranch);

  const headEsperado = headEsperadoTrasOperacion(op);
  const ramaEsperada = ramaEsperadaTrasOperacion(op);
  const exigeHead = TIPOS_CON_HEAD.has(op.tipo);

  if (exigeHead && !headEsperado) {
    throw new Error(
      'Esta entrada del journal no tiene ancla de HEAD suficiente para deshacer con seguridad.'
    );
  }

  if (headEsperado && headActual !== headEsperado) {
    throw new Error(
      'El repositorio ya no está en el commit registrado (HEAD distinto). ' +
        'Cambiaste de rama o hiciste commits fuera de Abyssan; no se deshace para no corromper el historial.'
    );
  }

  const ramaRegistrada = Boolean(op.despues?.rama?.trim());
  if (ramaRegistrada && ramaEsperada) {
    if (!ramaActual || ramaActual !== ramaEsperada) {
      throw new Error(
        `La rama activa («${ramaActual ?? 'HEAD desvinculado'}») no coincide con la registrada «${ramaEsperada}». ` +
          'Cambiaste de rama fuera de Abyssan; no se deshace.'
      );
    }
  }
}

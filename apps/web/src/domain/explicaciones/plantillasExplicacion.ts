// Austria: Plantillas de explicación Git para el Modo Aprendizaje (Fase 4.3)
// Cero red, cero LLM. Solo texto estático en español.

import type { TipoOperacionJournal } from '../models/GitModels';

export interface PlantillaExplicacion {
  titulo: string;
  explicacion: string;
  detalle: string;
}

const plantillas: Record<TipoOperacionJournal, PlantillaExplicacion> = {
  checkout: {
    titulo: 'Cambio de rama / checkout',
    explicacion:
      'Git movió HEAD (el puntero que indica dónde estás) a la rama o commit indicado. Los archivos del working tree se actualizaron para reflejar el estado de esa referencia.',
    detalle:
      'Si tenías cambios sin confirmar, Git los conserva si no hay conflicto con la rama destino. En caso de conflicto, Git rechaza el checkout y te pide que confirmes o guardes tus cambios primero (stash).',
  },
  commit: {
    titulo: 'Nuevo commit',
    explicacion:
      'Git tomó una instantánea de los archivos que estaban en el staging area (índice) y la guardó como un nuevo commit en la historia de la rama actual.',
    detalle:
      'Cada commit tiene un hash único (SHA-1), un autor, una fecha y un mensaje. HEAD avanzó al nuevo commit. Los archivos que no estaban en staging no se incluyeron.',
  },
  amend: {
    titulo: 'Commit enmendado',
    explicacion:
      'Git reescribió el último commit: reemplazó su mensaje y/o contenido con los cambios actuales del staging area. El hash del commit cambió porque la historia se modificó.',
    detalle:
      'Enmendar un commit que ya se publicó (push) requiere un force push posterior, lo que puede afectar a otros colaboradores. Solo enmienda commits locales salvo que sepas lo que haces.',
  },
  merge: {
    titulo: 'Fusión (merge)',
    explicacion:
      'Git intentó integrar los cambios de otra rama en la rama actual. Si no hubo conflictos, creó un commit de merge que une ambas historias.',
    detalle:
      'Un merge fast-forward mueve HEAD sin crear commit extra (las historias son lineales). Un merge con --no-ff siempre crea un commit de fusión. Si hay conflictos, Git pausa el merge y te pide resolverlos.',
  },
  reset: {
    titulo: 'Reset',
    explicacion:
      'Git movió HEAD al commit indicado. Dependiendo del modo (soft, mixed, hard), también actualizó el índice y/o el working tree.',
    detalle:
      'Soft: solo mueve HEAD; tus archivos staged quedan igual. Mixed (por defecto): mueve HEAD y limpia el staging, pero conserva el working tree. Hard: mueve HEAD, limpia staging y working tree — los cambios no confirmados se pierden.',
  },
  discard: {
    titulo: 'Descarte de cambios',
    explicacion:
      'Git restauró el archivo a su estado en el último commit (o lo eliminó si era untracked). Los cambios del working tree en ese archivo se perdieron.',
    detalle:
      'Equivale a git restore --worktree. Abyssan guarda un snapshot antes del discard para que puedas recuperar el archivo desde el Timeline si te arrepientes.',
  },
  crearRama: {
    titulo: 'Rama creada',
    explicacion:
      'Git creó un nuevo puntero (rama) que apunta al commit actual o al punto de inicio indicado. No cambió el working tree ni movió HEAD.',
    detalle:
      'Una rama en Git es solo un archivo de texto con un hash de 40 caracteres. Crear una rama es instantáneo y no duplica archivos. Para trabajar en ella, necesitas hacer checkout.',
  },
  borrarRama: {
    titulo: 'Rama eliminada',
    explicacion:
      'Git eliminó el puntero de la rama. Los commits que solo eran alcanzables desde esa rama siguen existiendo temporalmente en el reflog, pero eventualmente el garbage collector los limpiará.',
    detalle:
      'Si la rama no estaba mergeada, sus commits exclusivos quedan huérfanos. Puedes recuperarlos desde el reflog mientras no se ejecute git gc.',
  },
  renombrarRama: {
    titulo: 'Rama renombrada',
    explicacion:
      'Git cambió el nombre del puntero de la rama. El historial de commits no se modificó; solo cambió la etiqueta.',
    detalle:
      'Si la rama tiene un upstream configurado (tracking remoto), puede que necesites actualizar la referencia remota manualmente.',
  },
  pull: {
    titulo: 'Pull (descargar e integrar)',
    explicacion:
      'Git ejecutó un fetch (descargó los cambios del remoto) y luego integró esos cambios en la rama actual usando merge o rebase, según la configuración.',
    detalle:
      'Pull = fetch + merge (o fetch + rebase). Si hay conflictos, Git pausa la integración y te pide resolverlos. Después de un pull, la historia local incluye los commits del remoto.',
  },
  push: {
    titulo: 'Push (publicar)',
    explicacion:
      'Git envió los commits locales de la rama actual al repositorio remoto. El remoto ahora tiene tu historia actualizada.',
    detalle:
      'Un push solo funciona si tu rama local está adelante del remoto (no hay divergencia). Si el remoto tiene commits que tú no tienes, Git rechaza el push y te pide hacer pull primero.',
  },
  clone: {
    titulo: 'Repositorio clonado',
    explicacion:
      'Git descargó toda la historia del repositorio remoto y creó una copia local completa, incluyendo todas las ramas, tags y commits.',
    detalle:
      'El clone configura automáticamente un remoto llamado "origin" que apunta a la URL de origen. Tu rama principal se configura para seguir (track) la rama principal del remoto.',
  },
  init: {
    titulo: 'Repositorio inicializado',
    explicacion:
      'Git creó un directorio .git dentro de la carpeta, convirtiéndola en un repositorio Git vacío. Aún no hay commits ni historia.',
    detalle:
      'El directorio .git contiene toda la base de datos de objetos, las referencias y la configuración. El primer commit que hagas será el commit raíz del repositorio.',
  },
  'cherry-pick': {
    titulo: 'Cherry-pick',
    explicacion:
      'Git aplicó los cambios de un commit específico sobre la rama actual, creando un nuevo commit con el mismo contenido pero un hash diferente.',
    detalle:
      'Cherry-pick no mueve ramas ni modifica la historia original. Es como copiar un parche de un lugar a otro. Si hay conflictos, Git pausa y te pide resolverlos.',
  },
  revert: {
    titulo: 'Revert',
    explicacion:
      'Git creó un nuevo commit que deshace los cambios introducidos por un commit anterior. La historia no se reescribe: el commit original sigue visible.',
    detalle:
      'A diferencia de reset, revert es seguro para ramas publicadas porque añade historia en lugar de borrarla. El nuevo commit tiene un mensaje que referencia al commit revertido.',
  },
};

/**
 * Obtiene la plantilla de explicación para un tipo de operación.
 * Siempre devuelve una plantilla válida (fallback genérico si el tipo no existe).
 */
export function obtenerPlantilla(tipo: TipoOperacionJournal): PlantillaExplicacion {
  return (
    plantillas[tipo] ?? {
      titulo: `Operación: ${tipo}`,
      explicacion: `Git ejecutó la operación "${tipo}".`,
      detalle: 'Consulta la documentación de Git para más información sobre esta operación.',
    }
  );
}

/** Lista de todos los tipos de operación con plantilla definida. */
export function tiposConPlantilla(): TipoOperacionJournal[] {
  return Object.keys(plantillas) as TipoOperacionJournal[];
}

/** Clave de localStorage para la preferencia. */
export const CLAVE_MODO_APRENDIZAJE = 'abyssan.modoAprendizaje';

/** Lee la preferencia persistida. */
export function leerModoAprendizaje(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CLAVE_MODO_APRENDIZAJE) === '1';
}

/** Persiste la preferencia. */
export function guardarModoAprendizaje(activo: boolean): void {
  window.localStorage.setItem(CLAVE_MODO_APRENDIZAJE, activo ? '1' : '0');
}

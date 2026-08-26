export type HunkConflicto = {
  actual: string;
  entrante: string;
  encabezadoActual: string;
  encabezadoEntrante: string;
};

/**
 * Extrae todos los bloques <<<<<<< / ======= / >>>>>>> de un archivo en conflicto.
 */
export function parsearHunksConflicto(raw: string): HunkConflicto[] {
  if (!raw) return [];
  const normalizado = raw.replace(/\r\n/g, '\n');
  const hunks: HunkConflicto[] = [];
  const re =
    /^(<<<<<<<[^\n]*)\n([\s\S]*?)^=======\n([\s\S]*?)^(>>>>>>>[^\n]*)(?:\n|$)/gm;
  let match: RegExpExecArray | null = re.exec(normalizado);
  while (match) {
    hunks.push({
      encabezadoActual: match[1],
      actual: match[2],
      entrante: match[3],
      encabezadoEntrante: match[4],
    });
    match = re.exec(normalizado);
  }
  return hunks;
}

export function aplicarEstrategiaHunks(
  raw: string,
  estrategia: 'actual' | 'entrante' | 'ambos'
): string {
  const hunks = parsearHunksConflicto(raw);
  if (hunks.length === 0) return raw;
  const normalizado = raw.replace(/\r\n/g, '\n');
  const re =
    /^(<<<<<<<[^\n]*\n)([\s\S]*?)^=======\n([\s\S]*?)^(>>>>>>>[^\n]*)(?:\n|$)/gm;
  let indice = 0;
  return normalizado.replace(re, () => {
    const hunk = hunks[indice++];
    if (!hunk) return '';
    if (estrategia === 'actual') return hunk.actual;
    if (estrategia === 'entrante') return hunk.entrante;
    return `${hunk.actual}${hunk.actual.endsWith('\n') ? '' : '\n'}${hunk.entrante}`;
  });
}

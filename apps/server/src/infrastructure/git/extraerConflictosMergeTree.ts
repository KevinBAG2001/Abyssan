// Austria: Parser de `git merge-tree` clásico (3 árboles, stdout, sin --write-tree).

/**
 * Extrae rutas en conflicto del formato clásico de merge-tree
 * (`changed in both` / `CONFLICT (...)`). No interpreta un merge limpio
 * como conflicto.
 */
export function extraerConflictosMergeTree(salida: string): string[] {
  const archivos = new Set<string>();
  const bloques = salida.split(/(?=changed in both|CONFLICT )/);
  for (const bloque of bloques) {
    const esConflicto =
      bloque.startsWith('changed in both') ||
      bloque.startsWith('CONFLICT ') ||
      bloque.includes('<<<<<<<');
    if (!esConflicto) continue;
    for (const linea of bloque.split(/\r?\n/)) {
      const desdeArbol = linea.match(/^\s+(?:base|our|their)\s+\d+\s+[0-9a-f]+\s+(.+)$/i);
      if (desdeArbol?.[1]) {
        archivos.add(desdeArbol[1].trim());
        continue;
      }
      const conflicto = linea.match(/^CONFLICT\s+\([^)]+\):\s+.*\s(\S+)\s*$/);
      if (conflicto?.[1]) archivos.add(conflicto[1]);
    }
  }
  return [...archivos];
}

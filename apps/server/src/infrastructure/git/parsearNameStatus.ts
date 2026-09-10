export type EstadoArchivoCambio = 'modified' | 'added' | 'deleted' | 'renamed';

export type ArchivoCambioParseado = {
  path: string;
  status: EstadoArchivoCambio;
  pathAnterior?: string;
};

function estadoDeLetra(letra: string): EstadoArchivoCambio {
  const codigo = letra.trim().charAt(0).toUpperCase();
  if (codigo === 'A') return 'added';
  if (codigo === 'D') return 'deleted';
  if (codigo === 'R' || codigo === 'C') return 'renamed';
  return 'modified';
}

/** Parsea la salida de `git diff --name-status` / `git diff-tree --name-status`. */
export function parsearNameStatus(crudo: string): ArchivoCambioParseado[] {
  const lineas = crudo.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
  const archivos: ArchivoCambioParseado[] = [];

  for (const linea of lineas) {
    const partes = linea.split('\t');
    if (partes.length < 2) continue;
    const letra = partes[0] ?? '';
    const status = estadoDeLetra(letra);
    if ((status === 'renamed' && partes.length >= 3) || partes.length >= 3) {
      const anterior = partes[1]?.replace(/\\/g, '/') ?? '';
      const actual = partes[2]?.replace(/\\/g, '/') ?? anterior;
      if (!actual) continue;
      archivos.push({ path: actual, status: status === 'renamed' ? 'renamed' : status, pathAnterior: anterior });
      continue;
    }
    const path = partes[1]?.replace(/\\/g, '/') ?? '';
    if (!path) continue;
    archivos.push({ path, status });
  }

  return archivos;
}

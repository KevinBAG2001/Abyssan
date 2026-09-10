/** Diff unificado sintético para un archivo sin seguimiento (`git diff` no lo muestra). */

const LIMITE_BYTES = 1_000_000;

export function construirDiffArchivoNuevo(
  rutaRelativa: string,
  contenido: string,
  extras?: { binario?: boolean; omitidoPorTamano?: boolean }
): string {
  const posix = rutaRelativa.replace(/\\/g, '/');
  if (extras?.binario) {
    return [
      `diff --git a/${posix} b/${posix}`,
      'new file mode 100644',
      `Binary files /dev/null and b/${posix} differ`,
      '',
    ].join('\n');
  }
  if (extras?.omitidoPorTamano) {
    return [
      `diff --git a/${posix} b/${posix}`,
      'new file mode 100644',
      `--- /dev/null`,
      `+++ b/${posix}`,
      `@@ -0,0 +1,1 @@`,
      `+[Abyssan: archivo nuevo mayor de ${LIMITE_BYTES} bytes; no se muestra el contenido]`,
      '',
    ].join('\n');
  }

  const normalizado = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lineas =
    normalizado === ''
      ? []
      : normalizado.endsWith('\n')
        ? normalizado.slice(0, -1).split('\n')
        : normalizado.split('\n');
  const n = lineas.length;
  const cuerpo = n === 0 ? '' : lineas.map((l) => `+${l}`).join('\n');
  const hunkHeader = n === 0 ? '@@ -0,0 +0,0 @@' : `@@ -0,0 +1,${n} @@`;

  return [
    `diff --git a/${posix} b/${posix}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${posix}`,
    hunkHeader,
    ...(cuerpo ? [cuerpo] : []),
    '',
  ].join('\n');
}

export { LIMITE_BYTES as LIMITE_DIFF_ARCHIVO_NUEVO };

/**
 * Reglas de colapso del bloque «Cambios» en `PanelPreviewOperacion`.
 *
 * El modal `md` tiene ≈448 px de ancho y hasta ~448 px de alto útil en
 * pantallas de 800 px. Cuando el merge o el reset tocan muchos archivos, la
 * lista empuja «Riesgos» y, lo que es peor, el campo de confirmación tipada
 * del reset hard sucio fuera del viewport.
 *
 * Por eso, si el número de archivos supera `UMBRAL_COLAPSAR_CAMBIOS`, la
 * sección arranca contraída con un botón que la despliega. El contenido no
 * se oculta: solo se posterga a un gesto explícito del usuario.
 */

export const UMBRAL_COLAPSAR_CAMBIOS = 5 as const;

export function debeIniciarColapsado(totalArchivos: number): boolean {
  return totalArchivos > UMBRAL_COLAPSAR_CAMBIOS;
}

export function etiquetaDesplegarCambios(totalArchivos: number, totalCommits: number): string {
  const partes: string[] = [];
  if (totalArchivos > 0) {
    partes.push(`${totalArchivos} archivo${totalArchivos === 1 ? '' : 's'}`);
  }
  if (totalCommits > 0) {
    partes.push(`${totalCommits} commit${totalCommits === 1 ? '' : 's'}`);
  }
  if (partes.length === 0) {
    return 'Mostrar cambios';
  }
  return `Mostrar ${partes.join(' · ')}`;
}

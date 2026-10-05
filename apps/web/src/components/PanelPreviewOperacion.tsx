import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FileDiff, Info } from 'lucide-react';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import type { PreviewOperacionModel } from '../domain/models/GitModels';
import { cortoHash, etiquetaEstadoPreview } from '../domain/preview/etiquetaEstadoPreview';
import {
  ORDEN_SECCIONES_PREVIEW,
  type SeccionPreview,
} from '../domain/preview/ordenSeccionesPreview';
import {
  debeIniciarColapsado,
  etiquetaDesplegarCambios,
} from '../domain/preview/colapsarCambios';

function etiquetaArchivo(tipo: PreviewOperacionModel['archivosAfectados'][number]['tipo']): string {
  if (tipo === 'agregado') return 'A';
  if (tipo === 'eliminado') return 'D';
  if (tipo === 'conflicto') return 'C';
  return 'M';
}

type PanelPreviewOperacionProps = {
  preview: PreviewOperacionModel;
};

export function PanelPreviewOperacion({ preview }: PanelPreviewOperacionProps) {
  const totalArchivos = preview.archivosAfectados.length;
  const totalCommits = preview.commitsAfectados.length;

  const archivos = preview.archivosAfectados.slice(0, 8);
  const restoArchivos = Math.max(0, totalArchivos - archivos.length);
  const commits = preview.commitsAfectados.slice(0, 5);
  const restoCommits = Math.max(0, totalCommits - commits.length);

  const inicialColapsado = useMemo(() => debeIniciarColapsado(totalArchivos), [totalArchivos]);
  const [cambiosDesplegados, setCambiosDesplegados] = useState(!inicialColapsado);

  const bloqueCambios: ReactNode =
    commits.length === 0 && archivos.length === 0 ? (
      <p className="text-code-sm text-on-surface-variant/70">Sin commits ni archivos adicionales.</p>
    ) : (
      <div className="space-y-2">
        {commits.length > 0 && (
          <ul className="space-y-1">
            {commits.map((commit) => (
              <li key={commit.hash} className="flex items-baseline gap-2 text-code-sm font-mono">
                <span className="text-primary shrink-0">{commit.shortHash || cortoHash(commit.hash)}</span>
                <span className="truncate text-on-surface-variant">{commit.message}</span>
              </li>
            ))}
            {restoCommits > 0 && (
              <li className="text-code-sm text-on-surface-variant/70">… y {restoCommits} commit(s) más</li>
            )}
          </ul>
        )}
        {archivos.length > 0 && (
          <ul className="space-y-1">
            {archivos.map((archivo) => (
              <li
                key={`${archivo.tipo}-${archivo.path}`}
                className="flex items-center gap-2 text-code-sm font-mono text-on-surface-variant"
              >
                <span
                  className={cn(
                    'w-4 shrink-0 text-[10px]',
                    archivo.tipo === 'conflicto' ? 'text-magma' : 'text-primary',
                  )}
                >
                  {etiquetaArchivo(archivo.tipo)}
                </span>
                <span className="truncate">{archivo.path}</span>
              </li>
            ))}
            {restoArchivos > 0 && (
              <li className="text-code-sm text-on-surface-variant/70">… y {restoArchivos} más</li>
            )}
          </ul>
        )}
      </div>
    );

  const secciones: Record<SeccionPreview, ReactNode> = {
    explicacion: (
      <section key="explicacion" data-seccion="explicacion">
        <h3 className={cn(ui.labelCaps, 'mb-1.5 flex items-center gap-1.5')}>
          <Info className="w-3 h-3" aria-hidden />
          Explicación
        </h3>
        <p className="text-code-sm text-on-surface-variant leading-relaxed">{preview.explicacion}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-code-sm font-mono">
          <dt className="text-on-surface-variant/70">Actual</dt>
          <dd className="text-on-surface truncate">{etiquetaEstadoPreview(preview.estadoActual)}</dd>
          <dt className="text-on-surface-variant/70">Entrante</dt>
          <dd className="text-on-surface truncate">{etiquetaEstadoPreview(preview.estadoObjetivo)}</dd>
        </dl>
      </section>
    ),
    riesgos: (
      <section key="riesgos" data-seccion="riesgos">
        <h3 className={cn(ui.labelCaps, 'mb-1.5 flex items-center gap-1.5')}>
          <AlertTriangle className="w-3 h-3" aria-hidden />
          Riesgos
        </h3>
        {preview.advertencias.length === 0 && preview.posiblesConflictos.length === 0 ? (
          <p className="text-code-sm text-on-surface-variant/70">Ningún riesgo adicional detectado.</p>
        ) : (
          <ul className="text-code-sm text-ember space-y-1">
            {preview.advertencias.map((advertencia) => (
              <li key={advertencia}>• {advertencia}</li>
            ))}
            {preview.posiblesConflictos.map((archivo) => (
              <li key={`conflicto-${archivo}`} className="text-magma">
                • Conflicto: {archivo}
              </li>
            ))}
          </ul>
        )}
      </section>
    ),
    cambios: (
      <section key="cambios" data-seccion="cambios">
        {inicialColapsado ? (
          <button
            type="button"
            onClick={() => setCambiosDesplegados((v) => !v)}
            className={cn(
              ui.labelCaps,
              'mb-1.5 flex w-full items-center gap-1.5 text-left hover:text-on-surface transition-colors',
            )}
            aria-expanded={cambiosDesplegados}
            aria-controls="panel-cambios-preview"
          >
            {cambiosDesplegados ? (
              <ChevronDown className="w-3 h-3" aria-hidden />
            ) : (
              <ChevronRight className="w-3 h-3" aria-hidden />
            )}
            <FileDiff className="w-3 h-3" aria-hidden />
            Cambios
            {!cambiosDesplegados && (
              <span className="ml-auto text-code-sm font-normal normal-case tracking-normal text-on-surface-variant">
                {etiquetaDesplegarCambios(totalArchivos, totalCommits)}
              </span>
            )}
          </button>
        ) : (
          <h3 className={cn(ui.labelCaps, 'mb-1.5 flex items-center gap-1.5')}>
            <FileDiff className="w-3 h-3" aria-hidden />
            Cambios
          </h3>
        )}
        {cambiosDesplegados ? <div id="panel-cambios-preview">{bloqueCambios}</div> : null}
      </section>
    ),
  };

  return (
    <div
      className="px-4 pb-3 space-y-3 overflow-y-auto max-h-[min(60vh,28rem)]"
      data-testid="panel-preview-operacion"
    >
      {ORDEN_SECCIONES_PREVIEW.map((clave) => secciones[clave])}
    </div>
  );
}

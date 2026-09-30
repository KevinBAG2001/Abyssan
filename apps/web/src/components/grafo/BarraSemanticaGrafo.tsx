import { AlertTriangle } from 'lucide-react';
import { BarraProgreso } from '../ui/barra-progreso';
import type { ResumenSemantico } from '../../lib/semantica-grafo';
import { cn } from '../../lib/utils';

type FocoGrafo = {
  shortHash: string;
  message: string;
  marcas: string;
};

type BarraSemanticaGrafoProps = {
  resumen: ResumenSemantico;
  foco: FocoGrafo | null;
};

function corto(hash: string | null): string {
  if (!hash) return '—';
  return hash.slice(0, 7);
}

function etiquetaOperacion(estado: 'en_cola' | 'corriendo'): string {
  return estado === 'en_cola' ? 'En cola' : 'En curso';
}

export function BarraSemanticaGrafo({ resumen, foco }: BarraSemanticaGrafoProps) {
  const avisos = resumen.advertencias.slice(0, 3);
  const baseUpstream = corto(resumen.hashMergeBaseUpstream);
  const tracking = resumen.tracking?.replace(/^remotes\//, '');

  return (
    <div
      id="semantica-grafo"
      className="border-b border-outline-variant bg-surface-container-low px-4 py-1.5 shrink-0 space-y-1"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-code-sm text-on-surface-variant min-w-0">
        <span className="text-on-surface">
          HEAD <span className="font-mono text-ion">{corto(resumen.hashHead)}</span>
          <span className="text-on-surface-variant"> · {resumen.ramaActual}</span>
        </span>
        <span title="Commits locales que el remoto aún no tiene">
          ↑ {resumen.ahead} por delante
          {resumen.salientesEnVentana > 0 ? ` (${resumen.salientesEnVentana} en el grafo)` : ''}
        </span>
        <span title="Commits del remoto que esta rama aún no tiene">
          ↓ {resumen.behind} por detrás
          {resumen.entrantesEnVentana > 0 ? ` (${resumen.entrantesEnVentana} en el grafo)` : ''}
        </span>
        {tracking ? (
          <span className="font-mono truncate" title="Upstream y merge-base">
            {tracking} · base {resumen.baseUpstreamLista ? baseUpstream : '…'}
          </span>
        ) : (
          <span>Sin upstream</span>
        )}
        {resumen.ramaSeleccionada ? (
          <span className="truncate" title="Rama inspeccionada en el sidebar">
            Inspección {resumen.ramaSeleccionada.replace(/^remotes\//, '')}
            {!resumen.baseSeleccionLista
              ? ' · base …'
              : resumen.hashMergeBaseSeleccion
                ? ` · base ${corto(resumen.hashMergeBaseSeleccion)} · ${resumen.propiosSeleccion} propios`
                : ' · sin base distinta'}
          </span>
        ) : null}
        {resumen.previewActivo ? (
          <span className={cn(resumen.previewSeguro === false ? 'text-magma' : 'text-primary')}>
            Vista previa {resumen.previewSeguro === false ? 'con riesgo' : 'lista'}
          </span>
        ) : null}
        {resumen.recuperables > 0 ? (
          <span title="Commits nombrados por el journal que aún se pueden deshacer">
            Recuperación {resumen.recuperables}
          </span>
        ) : null}
      </div>

      {resumen.operacion ? (
        <div className="flex items-center gap-2 max-w-md">
          <span className="text-code-sm text-on-surface shrink-0">
            {etiquetaOperacion(resumen.operacion.estado)} · {resumen.operacion.tipo}
            {resumen.operacion.etapa ? ` · ${resumen.operacion.etapa}` : ''}
          </span>
          <BarraProgreso
            valor={resumen.operacion.progreso}
            etiqueta={`Progreso de ${resumen.operacion.tipo}`}
            className="flex-1"
          />
        </div>
      ) : null}

      {avisos.length > 0 ? (
        <ul className="space-y-0.5" aria-live="polite">
          {avisos.map((aviso) => (
            <li key={aviso} className="flex items-start gap-1.5 text-code-sm text-ember">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
              <span>{aviso}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {foco ? (
        <p className="text-code-sm text-on-surface-variant truncate">
          Foco <span className="font-mono text-on-surface">{foco.shortHash}</span> {foco.message}
          {foco.marcas ? ` · ${foco.marcas}` : ''}
        </p>
      ) : null}
    </div>
  );
}

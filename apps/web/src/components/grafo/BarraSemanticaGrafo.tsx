import { AlertTriangle } from 'lucide-react';
import { BarraProgreso } from '../ui/barra-progreso';
import type { OperacionVisibleGrafo, ResumenSemantico } from '../../lib/semantica-grafo';
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

function textoInspeccion(resumen: ResumenSemantico): string | null {
  if (!resumen.ramaSeleccionada) return null;
  const nombre = resumen.ramaSeleccionada.replace(/^remotes\//, '');
  if (!resumen.baseSeleccionLista) return `Inspección ${nombre} · base …`;
  if (!resumen.hashMergeBaseSeleccion) return `Inspección ${nombre} · sin base distinta`;
  return `Inspección ${nombre} · base ${corto(resumen.hashMergeBaseSeleccion)} · ${resumen.propiosSeleccion} propios`;
}

function MetricaHead({ resumen }: { resumen: ResumenSemantico }) {
  return (
    <span className="text-on-surface">
      HEAD <span className="font-mono text-ion">{corto(resumen.hashHead)}</span>
      <span className="text-on-surface-variant"> · {resumen.ramaActual}</span>
    </span>
  );
}

function MetricaAhead({ resumen }: { resumen: ResumenSemantico }) {
  const extra = resumen.salientesEnVentana > 0 ? ` (${resumen.salientesEnVentana} en el grafo)` : '';
  return (
    <span title="Commits locales que el remoto aún no tiene">
      ↑ {resumen.ahead} por delante{extra}
    </span>
  );
}

function MetricaBehind({ resumen }: { resumen: ResumenSemantico }) {
  const extra = resumen.entrantesEnVentana > 0 ? ` (${resumen.entrantesEnVentana} en el grafo)` : '';
  return (
    <span title="Commits del remoto que esta rama aún no tiene">
      ↓ {resumen.behind} por detrás{extra}
    </span>
  );
}

function MetricaTracking({ resumen }: { resumen: ResumenSemantico }) {
  const tracking = resumen.tracking?.replace(/^remotes\//, '');
  if (!tracking) return <span>Sin upstream</span>;
  const base = resumen.baseUpstreamLista ? corto(resumen.hashMergeBaseUpstream) : '…';
  return (
    <span className="font-mono truncate" title="Upstream y merge-base">
      {tracking} · base {base}
    </span>
  );
}

function MetricaInspeccion({ resumen }: { resumen: ResumenSemantico }) {
  const texto = textoInspeccion(resumen);
  if (!texto) return null;
  return (
    <span className="truncate" title="Rama inspeccionada en el sidebar">
      {texto}
    </span>
  );
}

function MetricaPreview({ resumen }: { resumen: ResumenSemantico }) {
  if (!resumen.previewActivo) return null;
  const riesgo = resumen.previewSeguro === false;
  return (
    <span className={cn(riesgo ? 'text-magma' : 'text-primary')}>
      Vista previa {riesgo ? 'con riesgo' : 'lista'}
    </span>
  );
}

function MetricaRecuperacion({ resumen }: { resumen: ResumenSemantico }) {
  if (resumen.recuperables <= 0) return null;
  return (
    <span title="Commits nombrados por el journal que aún se pueden deshacer">
      Recuperación {resumen.recuperables}
    </span>
  );
}

function FilaMetricas({ resumen }: { resumen: ResumenSemantico }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-code-sm text-on-surface-variant min-w-0">
      <MetricaHead resumen={resumen} />
      <MetricaAhead resumen={resumen} />
      <MetricaBehind resumen={resumen} />
      <MetricaTracking resumen={resumen} />
      <MetricaInspeccion resumen={resumen} />
      <MetricaPreview resumen={resumen} />
      <MetricaRecuperacion resumen={resumen} />
    </div>
  );
}

function FilaOperacion({ operacion }: { operacion: OperacionVisibleGrafo | null }) {
  if (!operacion) return null;
  const etapa = operacion.etapa ? ` · ${operacion.etapa}` : '';
  return (
    <div className="flex items-center gap-2 max-w-md">
      <span className="text-code-sm text-on-surface shrink-0">
        {etiquetaOperacion(operacion.estado)} · {operacion.tipo}
        {etapa}
      </span>
      <BarraProgreso
        valor={operacion.progreso}
        etiqueta={`Progreso de ${operacion.tipo}`}
        className="flex-1"
      />
    </div>
  );
}

function ListaAvisos({ avisos }: { avisos: string[] }) {
  const visibles = avisos.slice(0, 3);
  if (visibles.length === 0) return null;
  return (
    <ul className="space-y-0.5" aria-live="polite">
      {visibles.map((aviso) => (
        <li key={aviso} className="flex items-start gap-1.5 text-code-sm text-ember">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>{aviso}</span>
        </li>
      ))}
    </ul>
  );
}

function LineaFoco({ foco }: { foco: FocoGrafo | null }) {
  if (!foco) return null;
  const marcas = foco.marcas ? ` · ${foco.marcas}` : '';
  return (
    <p className="text-code-sm text-on-surface-variant truncate">
      Foco <span className="font-mono text-on-surface">{foco.shortHash}</span> {foco.message}
      {marcas}
    </p>
  );
}

export function BarraSemanticaGrafo({ resumen, foco }: BarraSemanticaGrafoProps) {
  return (
    <div
      id="semantica-grafo"
      className="border-b border-outline-variant bg-surface-container-low px-4 py-1.5 shrink-0 space-y-1"
    >
      <FilaMetricas resumen={resumen} />
      <FilaOperacion operacion={resumen.operacion} />
      <ListaAvisos avisos={resumen.advertencias} />
      <LineaFoco foco={foco} />
    </div>
  );
}

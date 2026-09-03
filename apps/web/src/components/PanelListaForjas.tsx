import { ExternalLink } from 'lucide-react';
import type { SolicitudForja } from '../infrastructure/api/HttpGitApi';

function claseLineaDiff(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
    return 'text-on-surface-variant/70';
  }
  if (line.startsWith('+')) return 'text-primary bg-primary-container/5';
  if (line.startsWith('-')) return 'text-error bg-magma/5';
  if (line.startsWith('@@')) return 'text-secondary';
  return 'text-on-surface-variant';
}

type PanelListaForjasProps = {
  cargandoLista: boolean;
  avisoForja: string | null;
  solicitudes: SolicitudForja[];
  seleccion: SolicitudForja | null;
  diff: string;
  cargandoDiff: boolean;
  checkoutEnCurso: boolean;
  onAbrir: (s: SolicitudForja) => void;
  onCheckout: () => void;
};

export function PanelListaForjas({
  cargandoLista,
  avisoForja,
  solicitudes,
  seleccion,
  diff,
  cargandoDiff,
  checkoutEnCurso,
  onAbrir,
  onCheckout,
}: PanelListaForjasProps) {
  return (
    <div className="flex flex-1 min-h-0 font-mono">
      <div className="w-full sm:w-72 border-r border-outline-variant overflow-y-auto shrink-0">
        {cargandoLista && <p className="p-3 text-code-sm text-on-surface-variant/70">Consultando la forja…</p>}
        {avisoForja && <p className="p-3 text-code-sm text-ember border-b border-outline-variant">{avisoForja}</p>}
        {!cargandoLista && solicitudes.length === 0 && !avisoForja && (
          <p className="p-3 text-code-sm text-on-surface-variant/70">No hay solicitudes abiertas.</p>
        )}
        {solicitudes.map((s) => (
          <button
            key={`${s.proveedor}-${s.numero}`}
            type="button"
            onClick={() => onAbrir(s)}
            className={`w-full text-left px-3 py-2.5 border-b border-outline-variant hover:bg-surface-container-highest transition-colors ${
              seleccion?.numero === s.numero ? 'bg-surface-container-highest border-l-2 border-l-secondary' : ''
            }`}
          >
            <div className="text-code-sm font-semibold text-on-surface truncate">
              #{s.numero} {s.titulo}
            </div>
            <div className="text-code-sm text-on-surface-variant/70 mt-0.5 truncate">
              {s.ramaOrigen} → {s.ramaDestino}
              {s.esFork ? ' · fork' : ''}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {seleccion ? (
          <>
            <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{seleccion.titulo}</p>
                <p className="text-[10px] text-on-surface-variant/70">
                  {seleccion.autor} · {seleccion.ramaOrigen} → {seleccion.ramaDestino}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={seleccion.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-on-surface-variant hover:text-on-surface"
                  title="Abrir en la forja"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  disabled={checkoutEnCurso}
                  onClick={onCheckout}
                  className="px-2.5 py-1 text-[11px] font-bold bg-secondary-container hover:brightness-110 text-on-primary rounded disabled:opacity-40"
                >
                  Checkout rama
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-surface-container p-2">
              {cargandoDiff ? (
                <p className="text-xs text-on-surface-variant/70 px-2">Cargando diff…</p>
              ) : (
                <pre className="text-[11px] font-mono leading-5">
                  {(diff || 'Sin diff.').split('\n').map((line, i) => (
                    <div key={`${i}-${line.slice(0, 24)}`} className={`px-2 whitespace-pre-wrap ${claseLineaDiff(line)}`}>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </>
        ) : (
          <p className="p-4 text-xs text-on-surface-variant/70">Selecciona una solicitud para ver el diff.</p>
        )}
      </div>
    </div>
  );
}

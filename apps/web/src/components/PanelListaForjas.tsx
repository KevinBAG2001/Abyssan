import { ExternalLink } from 'lucide-react';
import type { SolicitudForja } from '../infrastructure/api/HttpGitApi';

function claseLineaDiff(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
    return 'text-slate-500';
  }
  if (line.startsWith('+')) return 'text-emerald-400 bg-emerald-500/5';
  if (line.startsWith('-')) return 'text-rose-400 bg-rose-500/5';
  if (line.startsWith('@@')) return 'text-sky-400';
  return 'text-slate-300';
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
    <div className="flex flex-1 min-h-0">
      <div className="w-72 border-r border-[#23283b] overflow-y-auto">
        {cargandoLista && <p className="p-3 text-xs text-slate-500">Consultando la forja…</p>}
        {avisoForja && <p className="p-3 text-[11px] text-amber-300 border-b border-[#23283b]">{avisoForja}</p>}
        {!cargandoLista && solicitudes.length === 0 && !avisoForja && (
          <p className="p-3 text-xs text-slate-500">No hay solicitudes abiertas.</p>
        )}
        {solicitudes.map((s) => (
          <button
            key={`${s.proveedor}-${s.numero}`}
            type="button"
            onClick={() => onAbrir(s)}
            className={`w-full text-left px-3 py-2.5 border-b border-[#23283b] hover:bg-[#23283b] ${
              seleccion?.numero === s.numero ? 'bg-[#23283b]' : ''
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-200 truncate">
              #{s.numero} {s.titulo}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {s.ramaOrigen} → {s.ramaDestino}
              {s.esFork ? ' · fork' : ''}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {seleccion ? (
          <>
            <div className="px-3 py-2 border-b border-[#23283b] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{seleccion.titulo}</p>
                <p className="text-[10px] text-slate-500">
                  {seleccion.autor} · {seleccion.ramaOrigen} → {seleccion.ramaDestino}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={seleccion.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Abrir en la forja"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  disabled={checkoutEnCurso}
                  onClick={onCheckout}
                  className="px-2.5 py-1 text-[11px] font-bold bg-sky-500 hover:bg-sky-600 text-slate-950 rounded disabled:opacity-40"
                >
                  Checkout rama
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[#10131e] p-2">
              {cargandoDiff ? (
                <p className="text-xs text-slate-500 px-2">Cargando diff…</p>
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
          <p className="p-4 text-xs text-slate-500">Selecciona una solicitud para ver el diff.</p>
        )}
      </div>
    </div>
  );
}

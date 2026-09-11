// Austria: Panel de explicación Git — Modo Aprendizaje (Fase 4.3)
import { useState } from 'react';
import { GraduationCap, Copy, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { obtenerPlantilla } from '../domain/explicaciones/plantillasExplicacion';
import type { TipoOperacionJournal } from '../domain/models/GitModels';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

type Props = {
  tipo: TipoOperacionJournal;
  comandoGit?: string;
  onCerrar: () => void;
};

export function PanelExplicacion({ tipo, comandoGit, onCerrar }: Props) {
  const plantilla = obtenerPlantilla(tipo);
  const [copiado, setCopiado] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const copiar = async () => {
    if (!comandoGit) return;
    try {
      await navigator.clipboard.writeText(comandoGit);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div
      role="complementary"
      aria-label="Explicación de la operación Git"
      className={cn(
        'fixed top-16 right-4 z-[55] w-[min(22rem,calc(100vw-2rem))]',
        'rounded-lg border border-tertiary-fixed-dim/40 bg-surface-container-low/95 backdrop-blur-sm shadow-2xl',
        'animate-[slideIn_200ms_ease-out]'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant">
        <GraduationCap className="w-4 h-4 text-tertiary-fixed-dim shrink-0" />
        <span className="text-label-md font-semibold text-on-surface flex-1 truncate">
          {plantilla.titulo}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className={ui.btnIcono}
          title="Cerrar explicación"
          aria-label="Cerrar explicación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">
        <p className="text-body-md text-on-surface leading-relaxed">
          {plantilla.explicacion}
        </p>

        {comandoGit && (
          <div>
            <span className={cn(ui.labelCaps, 'block mb-1')}>Comando equivalente</span>
            <div className="flex items-start gap-2 rounded border border-outline-variant bg-void px-3 py-2 font-mono text-code-sm text-primary">
              <span className="flex-1 break-all leading-relaxed">{comandoGit}</span>
              <button
                type="button"
                onClick={() => void copiar()}
                className={ui.btnIcono}
                title="Copiar comando"
                aria-label="Copiar comando Git"
              >
                {copiado ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex items-center gap-1 text-code-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {expandido ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {expandido ? 'Menos detalle' : 'Más detalle'}
        </button>

        {expandido && (
          <p className="text-code-sm text-on-surface-variant leading-relaxed border-l-2 border-tertiary-fixed-dim/30 pl-3">
            {plantilla.detalle}
          </p>
        )}
      </div>
    </div>
  );
}

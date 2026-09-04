import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Search, ArrowDown, ArrowUp, Download, Send, GitPullRequest } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';
import { cn } from '../lib/utils';

export type AccionPaleta = 'fetch' | 'pull' | 'push' | 'commit' | 'forjas';

interface PaletaComandosProps {
  onCerrar: () => void;
  onAccion: (accion: AccionPaleta) => void;
}

const ACCIONES: {
  id: AccionPaleta;
  label: string;
  hint: string;
  categoria: string;
  atajo: string;
  icon: React.ReactNode;
}[] = [
  { id: 'fetch', label: 'Fetch', hint: 'Traer refs del remoto', categoria: 'Acciones de remoto', atajo: 'F', icon: <Download className="w-4 h-4" /> },
  { id: 'pull', label: 'Pull', hint: 'Integrar cambios del remoto', categoria: 'Acciones de remoto', atajo: 'L', icon: <ArrowDown className="w-4 h-4" /> },
  { id: 'push', label: 'Push', hint: 'Enviar commits', categoria: 'Acciones de remoto', atajo: 'P', icon: <ArrowUp className="w-4 h-4" /> },
  { id: 'commit', label: 'Enfocar commit', hint: 'Ir al formulario de commit', categoria: 'Navegación', atajo: 'C', icon: <Send className="w-4 h-4" /> },
  { id: 'forjas', label: 'PRs / MRs', hint: 'Solicitudes del origin', categoria: 'Navegación', atajo: 'M', icon: <GitPullRequest className="w-4 h-4" /> },
];

function agruparVisibles(filtro: string) {
  const termino = filtro.toLowerCase();
  const visibles = ACCIONES.filter((a) => `${a.label} ${a.hint}`.toLowerCase().includes(termino));
  const grupos = new Map<string, { accion: (typeof ACCIONES)[number]; idx: number }[]>();

  visibles.forEach((accion, idx) => {
    const lista = grupos.get(accion.categoria) ?? [];
    lista.push({ accion, idx });
    grupos.set(accion.categoria, lista);
  });

  return { visibles, grupos: [...grupos.entries()] };
}

export const PaletaComandos: React.FC<PaletaComandosProps> = ({ onCerrar, onAccion }) => {
  const [filtro, setFiltro] = useState('');
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { visibles, grupos } = useMemo(() => agruparVisibles(filtro), [filtro]);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const cerrar = () => {
    setFiltro('');
    onCerrar();
  };

  const ejecutar = (id: AccionPaleta) => {
    onAccion(id);
    cerrar();
  };

  const onFiltroChange = (valor: string) => {
    setFiltro(valor);
    setActivo(0);
  };

  return (
    <ModalCapa ancho="paleta" onCerrar={cerrar} labelledBy="titulo-paleta" className="bg-surface-container p-0 overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-outline-variant bg-surface-container-high">
        <Search className="w-4 h-4 text-on-surface-variant mr-2 shrink-0" aria-hidden="true" />
        <label htmlFor="paleta-filtro" id="titulo-paleta" className="sr-only">
          Buscar comando
        </label>
        <input
          id="paleta-filtro"
          ref={inputRef}
          value={filtro}
          onChange={(e) => onFiltroChange(e.target.value)}
          placeholder="Buscar comando…"
          className="flex-1 bg-transparent font-mono text-code-md text-primary focus:outline-none placeholder:text-on-surface-variant/50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') cerrar();
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActivo((i) => Math.min(i + 1, visibles.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActivo((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && visibles[activo]) ejecutar(visibles[activo].id);
          }}
        />
        <kbd className="font-mono text-code-sm text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-outline-variant ml-2">
          esc
        </kbd>
      </div>

      <div className="py-2 max-h-80 overflow-y-auto">
        {visibles.length === 0 ? (
          <p className="px-4 py-6 text-label-md text-on-surface-variant/70 text-center">Sin coincidencias</p>
        ) : (
          grupos.map(([cat, items]) => (
            <div key={cat}>
              <div className="px-4 py-1">
                <span className="text-label-caps text-on-surface-variant uppercase opacity-70">{cat}</span>
              </div>
              {items.map(({ accion: a, idx }) => {
                const seleccionado = idx === activo;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => ejecutar(a.id)}
                    onMouseEnter={() => setActivo(idx)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2 transition-colors group',
                      seleccionado
                        ? 'bg-surface-container-highest border-l-2 border-primary'
                        : 'hover:bg-surface-container-highest border-l-2 border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(seleccionado ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary')}>
                        {a.icon}
                      </span>
                      <span className={cn('text-label-md', seleccionado ? 'text-primary' : 'text-on-surface group-hover:text-primary')}>
                        {a.label}
                      </span>
                      <span className="text-label-md text-on-surface-variant/70 truncate hidden sm:inline">{a.hint}</span>
                    </div>
                    <kbd
                      className={cn(
                        'font-mono text-code-sm px-1.5 py-0.5 rounded border shrink-0',
                        seleccionado
                          ? 'bg-surface-dim text-primary border-primary'
                          : 'bg-surface-dim text-on-surface border-outline-variant group-hover:border-primary group-hover:text-primary'
                      )}
                    >
                      {a.atajo}
                    </kbd>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-outline-variant bg-surface-container-low text-code-sm text-on-surface-variant">
        <span>↑↓ navegar</span>
        <span>↵ ejecutar</span>
      </div>
    </ModalCapa>
  );
};

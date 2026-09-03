import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowDown, ArrowUp, Download, Send, GitPullRequest } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';
import { cn } from '../lib/utils';

export type AccionPaleta = 'fetch' | 'pull' | 'push' | 'commit' | 'forjas';

interface PaletaComandosProps {
  abierta: boolean;
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

export const PaletaComandos: React.FC<PaletaComandosProps> = ({ abierta, onCerrar, onAccion }) => {
  const [filtro, setFiltro] = useState('');
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibles = ACCIONES.filter((a) =>
    `${a.label} ${a.hint}`.toLowerCase().includes(filtro.toLowerCase())
  );

  useEffect(() => {
    if (abierta) {
      setFiltro('');
      setActivo(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierta]);

  useEffect(() => {
    setActivo(0);
  }, [filtro]);

  if (!abierta) return null;

  const cerrar = () => {
    setFiltro('');
    onCerrar();
  };

  const ejecutar = (id: AccionPaleta) => {
    onAccion(id);
    cerrar();
  };

  const categorias = [...new Set(visibles.map((a) => a.categoria))];

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
          onChange={(e) => setFiltro(e.target.value)}
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
          categorias.map((cat) => (
            <div key={cat}>
              <div className="px-4 py-1">
                <span className="text-label-caps text-on-surface-variant uppercase opacity-70">{cat}</span>
              </div>
              {visibles
                .filter((a) => a.categoria === cat)
                .map((a) => {
                  const idx = visibles.indexOf(a);
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

import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowDown, ArrowUp, Download, Send, GitPullRequest } from 'lucide-react';
import { Dialogo } from './ui/dialogo';

export type AccionPaleta = 'fetch' | 'pull' | 'push' | 'commit' | 'forjas';

interface PaletaComandosProps {
  abierta: boolean;
  onCerrar: () => void;
  onAccion: (accion: AccionPaleta) => void;
}

const ACCIONES: { id: AccionPaleta; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'fetch', label: 'Fetch', hint: 'Traer refs del remoto', icon: <Download className="w-3.5 h-3.5 text-sky-400" /> },
  { id: 'pull', label: 'Pull', hint: 'Integrar cambios del remoto', icon: <ArrowDown className="w-3.5 h-3.5 text-sky-400" /> },
  { id: 'push', label: 'Push', hint: 'Enviar commits', icon: <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'commit', label: 'Enfocar commit', hint: 'Ir al formulario de commit', icon: <Send className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'forjas', label: 'PRs / MRs', hint: 'Solicitudes del origin', icon: <GitPullRequest className="w-3.5 h-3.5 text-sky-400" /> },
];

export const PaletaComandos: React.FC<PaletaComandosProps> = ({ abierta, onCerrar, onAccion }) => {
  const [filtro, setFiltro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!abierta) return null;

  const visibles = ACCIONES.filter((a) => a.label.toLowerCase().includes(filtro.toLowerCase()));
  const cerrar = () => {
    setFiltro('');
    onCerrar();
  };

  return (
    <Dialogo
      onCerrar={cerrar}
      labelledBy="titulo-paleta"
      className="w-full max-w-md rounded-xl border border-[#2e354e] bg-[#181c2d] p-0 shadow-2xl backdrop:bg-black/50"
    >
      <PaletaFoco inputRef={inputRef} />
      <div className="flex items-center px-3 border-b border-[#23283b]">
        <Search className="w-4 h-4 text-slate-500" aria-hidden="true" />
        <label htmlFor="paleta-filtro" id="titulo-paleta" className="sr-only">
          Buscar comando
        </label>
        <input
          id="paleta-filtro"
          ref={inputRef}
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Fetch, pull, push, commit, PRs…"
          className="w-full bg-transparent px-2 py-3 text-sm text-white focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') cerrar();
            if (e.key === 'Enter' && visibles[0]) {
              onAccion(visibles[0].id);
              cerrar();
            }
          }}
        />
      </div>
      <div className="p-1.5">
        {visibles.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              onAccion(a.id);
              cerrar();
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-xs text-slate-200 hover:bg-[#23283b]"
          >
            {a.icon}
            <span className="font-semibold">{a.label}</span>
            <span className="text-slate-500">{a.hint}</span>
          </button>
        ))}
      </div>
    </Dialogo>
  );
};

function PaletaFoco({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);
  return null;
}

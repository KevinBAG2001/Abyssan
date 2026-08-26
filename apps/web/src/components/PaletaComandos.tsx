import React, { useEffect, useRef } from 'react';
import { Search, ArrowDown, ArrowUp, Download, Send, GitPullRequest } from 'lucide-react';

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
  const [filtro, setFiltro] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierta) {
      setFiltro('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierta]);

  if (!abierta) return null;

  const visibles = ACCIONES.filter((a) => a.label.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center pt-[15vh]" onClick={onCerrar}>
      <div
        className="w-full max-w-md bg-[#181c2d] border border-[#2e354e] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 border-b border-[#23283b]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Fetch, pull, push, commit, PRs…"
            className="w-full bg-transparent px-2 py-3 text-sm text-white focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCerrar();
              if (e.key === 'Enter' && visibles[0]) {
                onAccion(visibles[0].id);
                onCerrar();
              }
            }}
          />
        </div>
        <div className="p-1.5">
          {visibles.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onAccion(a.id);
                onCerrar();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-xs text-slate-200 hover:bg-[#23283b]"
            >
              {a.icon}
              <span className="font-semibold">{a.label}</span>
              <span className="text-slate-500">{a.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

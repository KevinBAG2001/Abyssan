import React from 'react';
import { Search, X, GitBranch, ChevronDown, Minus, ArrowDownUp, Plus } from 'lucide-react';
import { ChipRama } from '../ui/chip-rama';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';

type Densidad = 'compacta' | 'normal' | 'amplia';

interface BarraSuperiorGrafoProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  hashesCoincidentes: Set<string> | null;
  totalCommits: number;
  filtroAbierto: boolean;
  onToggleFiltro: () => void;
  densidad: Densidad;
  onCambiarDensidad: (d: Densidad) => void;
  ramasVisibles: string[];
}

export const BarraSuperiorGrafo: React.FC<BarraSuperiorGrafoProps> = ({
  searchTerm,
  onSearchChange,
  hashesCoincidentes,
  totalCommits,
  filtroAbierto,
  onToggleFiltro,
  densidad,
  onCambiarDensidad,
  ramasVisibles,
}) => (
  <div className="h-10 bg-surface-container-low border-b border-outline-variant px-4 flex items-center justify-between select-none shrink-0 gap-3 min-w-0">
    <div className="flex items-center gap-2 min-w-0 shrink">
      <GitBranch className="w-4 h-4 text-ion shrink-0" />
      <span className={ui.labelCaps}>Commit Graph</span>
      <div className="hidden sm:flex items-center gap-1 min-w-0 overflow-hidden">
        {ramasVisibles.map((r) => (
          <ChipRama key={r} nombre={r} tipo="rama" />
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2 flex-1 justify-end min-w-0 max-w-lg">
      <div className="relative w-full min-w-[8rem] max-w-xs">
        <label htmlFor="busqueda-commits" className="sr-only">Buscar commits</label>
        <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          id="busqueda-commits"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Mensaje, autor, hash…"
          className="w-full bg-surface-container-high border border-outline-variant rounded pl-8 pr-7 py-1 text-code-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary min-w-0 font-mono"
        />
        {searchTerm && (
          <button type="button" onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" aria-label="Limpiar búsqueda">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <span className="text-code-sm text-on-surface-variant font-mono shrink-0 hidden md:block">
        {hashesCoincidentes ? `${hashesCoincidentes.size}/` : ''}{totalCommits}
      </span>

      <button
        type="button"
        onClick={onToggleFiltro}
        className={cn(ui.btnIcono, filtroAbierto && 'ring-1 ring-primary bg-primary/10')}
        title="Filtros y resaltado"
        aria-label="Abrir filtros"
        aria-expanded={filtroAbierto}
      >
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtroAbierto && 'rotate-180')} />
      </button>

      <div className="flex items-center border border-outline-variant rounded shrink-0">
        <button type="button" onClick={() => onCambiarDensidad('compacta')} className={cn('p-1 transition-colors', densidad === 'compacta' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Compacto" aria-label="Densidad compacta">
          <Minus className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onCambiarDensidad('normal')} className={cn('p-1 transition-colors', densidad === 'normal' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Normal" aria-label="Densidad normal">
          <ArrowDownUp className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onCambiarDensidad('amplia')} className={cn('p-1 transition-colors', densidad === 'amplia' ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface')} title="Amplio" aria-label="Densidad amplia">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
);

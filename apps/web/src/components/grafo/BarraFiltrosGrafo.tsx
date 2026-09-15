import React from 'react';
import { User, GitBranch, Route, Waypoints, X } from 'lucide-react';
import { GitCommit } from '../../types/git';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';

interface BarraFiltrosGrafoProps {
  modo: { tipo: string; autor?: string; rama?: string };
  autores: string[];
  ramas: string[];
  selectedCommit: GitCommit | null;
  commitB: string | null;
  badgeModo: string | null;
  onModoAutor: (autor: string) => void;
  onModoRama: (rama: string) => void;
  onActivarAncestros: () => void;
  onActivarDescendientes: () => void;
  onIniciarComparar: () => void;
  onLimpiarModo: () => void;
}

export const BarraFiltrosGrafo: React.FC<BarraFiltrosGrafoProps> = ({
  modo,
  autores,
  ramas,
  selectedCommit,
  commitB,
  badgeModo,
  onModoAutor,
  onModoRama,
  onActivarAncestros,
  onActivarDescendientes,
  onIniciarComparar,
  onLimpiarModo,
}) => (
  <div className="bg-surface-container border-b border-outline-variant px-4 py-2 flex flex-wrap items-center gap-2 text-code-sm shrink-0 select-none">
    <FiltroAutor valor={modo.tipo === 'autor' ? modo.autor ?? '' : ''} autores={autores} onChange={onModoAutor} />
    <FiltroRama valor={modo.tipo === 'rama' || modo.tipo === 'explicacionRama' ? modo.rama ?? '' : ''} ramas={ramas} onChange={onModoRama} />

    <div className="h-4 w-px bg-outline-variant" />

    <button
      type="button"
      disabled={!selectedCommit}
      onClick={onActivarAncestros}
      className={cn(ui.btnIcono, 'text-code-sm gap-1', modo.tipo === 'ancestros' && 'ring-1 ring-secondary bg-secondary/10')}
      title={selectedCommit ? 'Resaltar ancestros' : 'Selecciona un commit primero'}
    >
      <Waypoints className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">Ancestros</span>
    </button>

    <button
      type="button"
      disabled={!selectedCommit}
      onClick={onActivarDescendientes}
      className={cn(ui.btnIcono, 'text-code-sm gap-1', modo.tipo === 'descendientes' && 'ring-1 ring-secondary bg-secondary/10')}
      title={selectedCommit ? 'Resaltar descendientes' : 'Selecciona un commit primero'}
    >
      <Waypoints className="w-3.5 h-3.5 rotate-180" />
      <span className="hidden lg:inline">Descendientes</span>
    </button>

    <button
      type="button"
      disabled={!selectedCommit}
      onClick={onIniciarComparar}
      className={cn(
        ui.btnIcono, 'text-code-sm gap-1',
        (commitB || modo.tipo === 'camino') && 'ring-1 ring-primary bg-primary/10',
      )}
      title={commitB ? `Commit A: ${commitB.substring(0, 7)} — selecciona el segundo commit y pulsa de nuevo` : 'Comparar dos commits (selecciona A, luego B)'}
    >
      <Route className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">{commitB ? `A: ${commitB.substring(0, 7)}…` : 'Comparar'}</span>
    </button>

    {badgeModo && (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-tertiary-fixed-dim/15 border border-tertiary-fixed-dim/30 rounded text-code-sm text-tertiary-fixed-dim">
        {badgeModo}
        <button type="button" onClick={onLimpiarModo} className="hover:text-on-surface" aria-label="Quitar filtro">
          <X className="w-3 h-3" />
        </button>
      </span>
    )}
  </div>
);

function FiltroAutor({ valor, autores, onChange }: { valor: string; autores: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <User className="w-3.5 h-3.5 text-on-surface-variant" />
      <label htmlFor="filtro-autor" className="sr-only">Filtrar por autor</label>
      <select
        id="filtro-autor"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container-high border border-outline-variant rounded px-2 py-0.5 text-code-sm text-on-surface focus:outline-none focus:border-primary font-mono max-w-[10rem]"
      >
        <option value="">Todos los autores</option>
        {autores.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}

function FiltroRama({ valor, ramas, onChange }: { valor: string; ramas: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <GitBranch className="w-3.5 h-3.5 text-on-surface-variant" />
      <label htmlFor="filtro-rama" className="sr-only">Filtrar por rama</label>
      <select
        id="filtro-rama"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container-high border border-outline-variant rounded px-2 py-0.5 text-code-sm text-on-surface focus:outline-none focus:border-primary font-mono max-w-[12rem]"
      >
        <option value="">Todas las ramas</option>
        {ramas.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}

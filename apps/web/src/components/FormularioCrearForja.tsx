import type { FormEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import type { SolicitudForjaCreada } from '../infrastructure/api/HttpGitApi';
import { CampoEntrada } from './ui/campo-entrada';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

type FormularioCrearForjaProps = {
  ramaActual: string;
  titulo: string;
  cuerpo: string;
  base: string;
  basesSugeridas: string[];
  creando: boolean;
  creada: SolicitudForjaCreada | null;
  etiquetaCrear: string;
  onTitulo: (v: string) => void;
  onCuerpo: (v: string) => void;
  onBase: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
};

export function FormularioCrearForja({
  ramaActual,
  titulo,
  cuerpo,
  base,
  basesSugeridas,
  creando,
  creada,
  etiquetaCrear,
  onTitulo,
  onCuerpo,
  onBase,
  onSubmit,
  onClose,
}: FormularioCrearForjaProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
      <p className="text-code-sm text-on-surface-variant">
        Rama cabeza: <span className="text-primary font-mono font-semibold">{ramaActual}</span> (debe existir en remoto)
      </p>
      <CampoEntrada
        id="forja-titulo"
        etiqueta="Título"
        value={titulo}
        onChange={(e) => onTitulo(e.target.value)}
        placeholder="Resumen de la solicitud"
      />
      <div className="space-y-1">
        <label htmlFor="forja-cuerpo" className={ui.labelCaps}>
          Descripción (opcional)
        </label>
        <textarea
          id="forja-cuerpo"
          value={cuerpo}
          onChange={(e) => onCuerpo(e.target.value)}
          placeholder="Contexto adicional"
          rows={4}
          className={cn(ui.input, 'resize-none font-mono')}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="forja-base" className={ui.labelCaps}>
          Rama destino (base)
        </label>
        <select
          id="forja-base"
          value={base}
          onChange={(e) => onBase(e.target.value)}
          className={cn(ui.input, 'font-mono')}
        >
          {basesSugeridas.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {creada && (
        <a
          href={creada.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-1 text-xs text-secondary hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>
            Abierta #{creada.numero}: {creada.titulo}
          </span>
        </a>
      )}
      <div className="flex justify-end space-x-2 pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-on-surface-variant">
          Cerrar
        </button>
        <button
          type="submit"
          disabled={creando || !titulo.trim() || ramaActual === base}
          className="px-3 py-1.5 text-xs font-bold bg-secondary-container hover:brightness-110 text-on-primary rounded disabled:opacity-40"
        >
          {etiquetaCrear}
        </button>
      </div>
    </form>
  );
}

import type { FormEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import type { SolicitudForjaCreada } from '../infrastructure/api/HttpGitApi';

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
    <form onSubmit={onSubmit} className="p-4 space-y-3 overflow-y-auto">
      <p className="text-[11px] text-on-surface-variant">
        La rama <span className="text-primary font-semibold">{ramaActual}</span> debe existir en el remoto
        (push previo). Si la forja no responde, commit y push locales siguen disponibles.
      </p>
      <label htmlFor="forja-titulo" className="block text-[11px] text-on-surface-variant">
        Título
      </label>
      <input
        id="forja-titulo"
        value={titulo}
        onChange={(e) => onTitulo(e.target.value)}
        placeholder="Resumen de la solicitud"
        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary"
      />
      <label htmlFor="forja-cuerpo" className="block text-[11px] text-on-surface-variant">
        Descripción (opcional)
      </label>
      <textarea
        id="forja-cuerpo"
        value={cuerpo}
        onChange={(e) => onCuerpo(e.target.value)}
        placeholder="Contexto adicional"
        rows={4}
        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary resize-none"
      />
      <label htmlFor="forja-base" className="block text-[11px] text-on-surface-variant">
        Rama destino (base)
        <select
          id="forja-base"
          value={base}
          onChange={(e) => onBase(e.target.value)}
          className="mt-1 w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none"
        >
          {basesSugeridas.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
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

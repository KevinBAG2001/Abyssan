import type { GitCommit } from '../../types/git';
import type { FamiliaCommit, MarcasCommit } from '../../lib/semantica-grafo';
import { textoMarcas, textoRelacion, type RelacionHead } from '../../lib/semantica-grafo';
import { ChipRama } from '../ui/chip-rama';
import { esRefRemota } from '../../lib/grafo-utils';

type FichaCommitSeleccionadoProps = {
  commit: GitCommit;
  familia: FamiliaCommit;
  relacion: RelacionHead;
  marcas: MarcasCommit;
  commitB: string | null;
  nombresRemotos: string[];
  onElegir: (hash: string) => void;
};

function fechaCorta(iso: string): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BotonFamiliar({
  hash,
  shortHash,
  message,
  enGrafo,
  onElegir,
}: {
  hash: string;
  shortHash: string;
  message: string | null;
  enGrafo: boolean;
  onElegir: (hash: string) => void;
}) {
  if (!enGrafo) {
    return (
      <span className="font-mono text-code-sm text-on-surface-variant/70" title="Fuera de los commits cargados">
        {shortHash}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onElegir(hash)}
      className="font-mono text-code-sm text-secondary hover:underline text-left truncate max-w-[16rem]"
      title={message ?? hash}
    >
      {shortHash}
      {message ? <span className="text-on-surface-variant font-sans"> {message}</span> : null}
    </button>
  );
}

export function FichaCommitSeleccionado({
  commit,
  familia,
  relacion,
  marcas,
  commitB,
  nombresRemotos,
  onElegir,
}: FichaCommitSeleccionadoProps) {
  const marcasTexto = textoMarcas(marcas);
  const ramas = commit.branches ?? [];
  const tags = commit.tags ?? [];

  return (
    <section
      aria-label="Commit seleccionado"
      className="border-b border-outline-variant bg-surface-container px-4 py-2 shrink-0 space-y-1.5"
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="font-mono text-code-sm text-primary shrink-0">{commit.shortHash}</span>
        <p className="text-code-sm text-on-surface truncate">{commit.message}</p>
      </div>
      <p className="text-code-sm text-on-surface-variant truncate">
        {commit.authorName || 'Autor desconocido'}
        {commit.authorEmail ? ` · ${commit.authorEmail}` : ''} · {fechaCorta(commit.date)}
      </p>
      <p className="text-code-sm text-on-surface-variant">{textoRelacion(relacion)}</p>
      {marcasTexto ? <p className="text-code-sm text-on-surface">{marcasTexto}</p> : null}
      {marcas.notaRecuperacion ? (
        <p className="text-code-sm text-ember">{marcas.notaRecuperacion}</p>
      ) : null}
      {marcas.preview ? (
        <p className="text-code-sm text-magma">Este commit entra en la vista previa de la operación.</p>
      ) : null}
      {commitB ? (
        <p className="text-code-sm text-secondary">
          Comparación en curso. Extremo guardado {commitB.slice(0, 7)}. Elige el otro commit y vuelve a comparar.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-code-sm text-on-surface-variant">Padres</span>
        {familia.padres.length === 0 ? (
          <span className="text-code-sm text-on-surface-variant/70">raíz</span>
        ) : (
          familia.padres.map((padre) => (
            <BotonFamiliar key={padre.hash} {...padre} onElegir={onElegir} />
          ))
        )}
        <span className="text-code-sm text-on-surface-variant">Hijos</span>
        {familia.hijos.length === 0 ? (
          <span className="text-code-sm text-on-surface-variant/70">ninguno en el grafo</span>
        ) : (
          familia.hijos.map((hijo) => <BotonFamiliar key={hijo.hash} {...hijo} onElegir={onElegir} />)
        )}
        {familia.hijosOcultos > 0 ? (
          <span className="text-code-sm text-on-surface-variant">y {familia.hijosOcultos} más</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {ramas.map((rama) => (
          <ChipRama key={rama} nombre={rama} tipo={esRefRemota(rama, nombresRemotos) ? 'remota' : 'rama'} />
        ))}
        {tags.map((tag) => (
          <ChipRama key={tag} nombre={tag} tipo="tag" />
        ))}
        {ramas.length === 0 && tags.length === 0 ? (
          <span className="text-code-sm text-on-surface-variant/70">Sin ramas ni tags en este commit</span>
        ) : null}
        <span className="text-code-sm text-on-surface-variant ml-1">
          Los archivos afectados están en el inspector.
        </span>
      </div>
    </section>
  );
}

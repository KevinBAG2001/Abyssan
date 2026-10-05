import { ModalIdentidadGit } from '../ModalIdentidadGit';
import { ModalSesionInstancia } from '../ModalSesionInstancia';
import { PanelExplicacion } from '../PanelExplicacion';
import { PanelTimeline } from '../PanelTimeline';
import { ToastNotificacion } from './ToastNotificacion';
import type { EntradaJournal, TipoOperacionJournal } from '../../domain/models/GitModels';

type ExplicacionVisible = {
  tipo: TipoOperacionJournal;
  comandoGit?: string;
};

type CapasEstadoAppProps = {
  toast: { message: string; type: 'success' | 'error' } | null;
  requiereToken: boolean;
  sesionLista: boolean;
  sesionCargando: boolean;
  sesionError: string | null;
  onAbrirSesion: (token?: string) => Promise<boolean>;
  explicacion: ExplicacionVisible | null;
  onCerrarExplicacion: () => void;
  timelineAbierta: boolean;
  journal: EntradaJournal[];
  loading: boolean;
  onCerrarTimeline: () => void;
  onDeshacer: (id: string) => void;
  identidadAbierta: boolean;
  repoPath: string | null;
  onCerrarIdentidad: () => void;
  onIdentidadGuardada: () => void;
  onError: (mensaje: string) => void;
};

export function CapasEstadoApp({
  toast,
  requiereToken,
  sesionLista,
  sesionCargando,
  sesionError,
  onAbrirSesion,
  explicacion,
  onCerrarExplicacion,
  timelineAbierta,
  journal,
  loading,
  onCerrarTimeline,
  onDeshacer,
  identidadAbierta,
  repoPath,
  onCerrarIdentidad,
  onIdentidadGuardada,
  onError,
}: CapasEstadoAppProps) {
  return (
    <>
      {toast ? <ToastNotificacion mensaje={toast.message} tipo={toast.type} /> : null}

      {requiereToken && !sesionLista ? (
        <ModalSesionInstancia error={sesionError} cargando={sesionCargando} onAbrir={onAbrirSesion} />
      ) : null}

      {sesionCargando && !sesionLista && !requiereToken ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/40">
          <p className="text-code-sm text-on-surface-variant">Abriendo sesión…</p>
        </div>
      ) : null}

      {explicacion ? (
        <PanelExplicacion
          tipo={explicacion.tipo}
          comandoGit={explicacion.comandoGit}
          onCerrar={onCerrarExplicacion}
        />
      ) : null}

      {timelineAbierta ? (
        <PanelTimeline
          entradas={journal}
          loading={loading}
          onCerrar={onCerrarTimeline}
          onDeshacer={onDeshacer}
        />
      ) : null}

      {identidadAbierta && repoPath ? (
        <ModalIdentidadGit
          repoPath={repoPath}
          onClose={onCerrarIdentidad}
          onGuardado={onIdentidadGuardada}
          onError={onError}
        />
      ) : null}
    </>
  );
}

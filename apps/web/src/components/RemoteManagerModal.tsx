import React, { useState } from 'react';
import { GitRemote } from '../types/git';
import { Globe, Plus, Trash2, RefreshCw } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { CampoEntrada } from './ui/campo-entrada';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

interface RemoteManagerModalProps {
  remotes: GitRemote[];
  loading: boolean;
  onAddRemote: (name: string, url: string) => void;
  onRemoveRemote: (name: string) => void;
  onFetchAll: () => void;
  onClose: () => void;
}

export const RemoteManagerModal: React.FC<RemoteManagerModalProps> = ({
  remotes,
  loading,
  onAddRemote,
  onRemoveRemote,
  onFetchAll,
  onClose,
}) => {
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteName.trim() && remoteUrl.trim()) {
      onAddRemote(remoteName.trim(), remoteUrl.trim());
      setRemoteName('');
      setRemoteUrl('');
    }
  };

  return (
    <ModalCapa ancho="lg" onCerrar={onClose} labelledBy="titulo-remotos" className="bg-surface-container select-none max-h-[80vh] flex flex-col">
      <ModalEncabezado
        id="titulo-remotos"
        titulo="Gestor de Remotos"
        subtitulo="URLs de fetch y push por remoto"
        icono={<Globe className="w-4 h-4 text-secondary" />}
        onCerrar={onClose}
      />

      <div className="px-4 py-2 border-b border-outline-variant flex justify-end bg-surface-container-low/30">
        <button
          type="button"
          onClick={onFetchAll}
          disabled={loading}
          className={cn(ui.btnSecundario, 'text-code-sm py-1')}
          title="Fetch --all --prune"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin text-primary')} />
          Fetch prune
        </button>
      </div>

      <div className="p-4 border-b border-outline-variant bg-surface-container-low/50">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CampoEntrada
              id="remoto-nombre"
              etiqueta="Nombre"
              value={remoteName}
              onChange={(e) => setRemoteName(e.target.value)}
              placeholder="origin"
            />
            <div className="sm:col-span-2">
              <CampoEntrada
                id="remoto-url"
                etiqueta="URL"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!remoteName.trim() || !remoteUrl.trim() || loading}
              className={cn(ui.btnSecundario, 'border-secondary text-secondary')}
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir remoto
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {remotes.length === 0 ? (
          <div className="text-center py-8 text-code-sm text-on-surface-variant/70 italic">
            No hay servidores remotos configurados
          </div>
        ) : (
          remotes.map((remote) => (
            <div key={remote.name} className={cn(ui.panelInset, 'p-3 flex items-start justify-between gap-2')}>
              <div className="truncate min-w-0 space-y-0.5">
                <span className="font-bold text-code-sm text-secondary font-mono">{remote.name}</span>
                <span className="text-code-sm font-mono text-on-surface-variant block truncate">
                  fetch: {remote.fetchUrl || 'N/A'}
                </span>
                <span className="text-code-sm font-mono text-on-surface-variant block truncate">
                  push: {remote.pushUrl || 'N/A'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveRemote(remote.name)}
                disabled={loading}
                className={ui.btnIcono}
                title="Eliminar remoto"
              >
                <Trash2 className="w-3.5 h-3.5 text-error" />
              </button>
            </div>
          ))
        )}
      </div>
    </ModalCapa>
  );
};

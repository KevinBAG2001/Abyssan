import React, { useState } from 'react';
import { GitRemote } from '../types/git';
import { Globe, Plus, Trash2, RefreshCw, X } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';

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
        {/* Encabezado */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-secondary" />
            <h3 id="titulo-remotos" className="text-headline-sm text-on-surface">Gestor de Remotos</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onFetchAll}
              disabled={loading}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded border border-outline-variant text-xs transition-colors disabled:opacity-50"
              title="Fetch All Remotes"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-primary' : ''}`} />
              <span>Fetch Prune</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formulario Agregar Remoto */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/50">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label htmlFor="remoto-nombre" className="block text-[11px] text-on-surface-variant mb-1">
                  Nombre
                </label>
                <input
                  id="remoto-nombre"
                  type="text"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  placeholder="origin"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="remoto-url" className="block text-[11px] text-on-surface-variant mb-1">
                  URL
                </label>
                <input
                  id="remoto-url"
                  type="text"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/…"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!remoteName.trim() || !remoteUrl.trim() || loading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-secondary-container hover:brightness-110 active:brightness-95 text-on-primary font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Anadir Remoto</span>
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Remotos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {remotes.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant/70 italic">
              No hay servidores remotos configurados
            </div>
          ) : (
            remotes.map((remote) => (
              <div
                key={remote.name}
                className="bg-surface-container-low border border-outline-variant rounded-lg p-3 flex items-center justify-between"
              >
                <div className="truncate pr-3 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-secondary">{remote.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant block truncate">
                    Fetch: {remote.fetchUrl || 'N/A'}
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant block truncate">
                    Push: {remote.pushUrl || 'N/A'}
                  </span>
                </div>

                <button
                  onClick={() => onRemoveRemote(remote.name)}
                  disabled={loading}
                  className="p-1.5 hover:bg-magma/20 text-on-surface-variant hover:text-error rounded transition-colors disabled:opacity-50 shrink-0"
                  title="Eliminar Remoto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
    </ModalCapa>
  );
};

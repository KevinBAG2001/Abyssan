import React, { useState } from 'react';
import { GitRemote } from '../types/git';
import { Globe, Plus, Trash2, RefreshCw, X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#181c2d] border border-[#2e354e] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Encabezado */}
        <div className="p-4 border-b border-[#23283b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">Gestor de Repositorios Remotos</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onFetchAll}
              disabled={loading}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#1b1f30] hover:bg-[#23283b] text-slate-300 hover:text-white rounded border border-[#2e354e] text-xs transition-colors disabled:opacity-50"
              title="Fetch All Remotes"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Fetch Prune</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formulario Agregar Remoto */}
        <div className="p-4 border-b border-[#23283b] bg-[#141724]/50">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label htmlFor="remoto-nombre" className="block text-[11px] text-slate-400 mb-1">
                  Nombre
                </label>
                <input
                  id="remoto-nombre"
                  type="text"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  placeholder="origin"
                  className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="remoto-url" className="block text-[11px] text-slate-400 mb-1">
                  URL
                </label>
                <input
                  id="remoto-url"
                  type="text"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/…"
                  className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!remoteName.trim() || !remoteUrl.trim() || loading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
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
            <div className="text-center py-8 text-xs text-slate-500 italic">
              No hay servidores remotos configurados
            </div>
          ) : (
            remotes.map((remote) => (
              <div
                key={remote.name}
                className="bg-[#141724] border border-[#23283b] rounded-lg p-3 flex items-center justify-between"
              >
                <div className="truncate pr-3 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-sky-400">{remote.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block truncate">
                    Fetch: {remote.fetchUrl || 'N/A'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 block truncate">
                    Push: {remote.pushUrl || 'N/A'}
                  </span>
                </div>

                <button
                  onClick={() => onRemoveRemote(remote.name)}
                  disabled={loading}
                  className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors disabled:opacity-50 shrink-0"
                  title="Eliminar Remoto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

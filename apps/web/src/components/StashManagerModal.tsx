import React, { useState } from 'react';
import { GitStash } from '../types/git';
import { Archive, Plus, Trash2, Play, X } from 'lucide-react';

interface StashManagerModalProps {
  stashes: GitStash[];
  loading: boolean;
  onSaveStash: (message?: string) => void;
  onPopStash: (index: number) => void;
  onDropStash: (index: number) => void;
  onClose: () => void;
}

export const StashManagerModal: React.FC<StashManagerModalProps> = ({
  stashes,
  loading,
  onSaveStash,
  onPopStash,
  onDropStash,
  onClose,
}) => {
  const [stashMessage, setStashMessage] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStash(stashMessage.trim() || undefined);
    setStashMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#181c2d] border border-[#2e354e] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#23283b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2">
            <Archive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Gestor de Stash</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guardar nuevo Stash */}
        <div className="p-4 border-b border-[#23283b] bg-[#141724]/50">
          <form onSubmit={handleSave} className="flex space-x-2">
            <input
              type="text"
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              placeholder="Mensaje descriptivo del Stash (opcional)..."
              className="flex-1 bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar Stash</span>
            </button>
          </form>
        </div>

        {/* Lista de Stashes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {stashes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic">
              No hay cambios guardados en Stash
            </div>
          ) : (
            stashes.map((stash) => (
              <div
                key={`${stash.index}-${stash.hash}`}
                className="bg-[#141724] border border-[#23283b] hover:border-[#2e354e] rounded-lg p-3 flex items-center justify-between transition-colors"
              >
                <div className="truncate pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      stash@&#123;{stash.index}&#125;
                    </span>
                    <span className="text-xs text-slate-200 font-medium truncate">{stash.message}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {new Date(stash.date).toLocaleString()}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => onPopStash(stash.index)}
                    disabled={loading}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded transition-colors disabled:opacity-50"
                    title="Aplicar y eliminar de la lista"
                  >
                    <Play className="w-3 h-3" />
                    <span>Pop</span>
                  </button>
                  <button
                    onClick={() => onDropStash(stash.index)}
                    disabled={loading}
                    className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors disabled:opacity-50"
                    title="Eliminar Stash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

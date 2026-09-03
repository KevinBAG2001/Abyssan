import React, { useState } from 'react';
import { GitStash } from '../types/git';
import { Archive, Plus, Trash2, Play, X } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';

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
    <ModalCapa ancho="lg" onCerrar={onClose} labelledBy="titulo-stash" className="bg-surface-container select-none max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2">
            <Archive className="w-5 h-5 text-primary" />
            <h3 id="titulo-stash" className="text-headline-sm text-on-surface">Gestor de Stash</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guardar nuevo Stash */}
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/50">
          <form onSubmit={handleSave} className="flex space-x-2 items-end">
            <div className="flex-1">
              <label htmlFor="stash-mensaje" className="block text-[11px] text-on-surface-variant mb-1">
                Mensaje del stash
              </label>
              <input
                id="stash-mensaje"
                type="text"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder="Opcional…"
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary-container hover:brightness-110 active:bg-primary-container text-on-primary font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar Stash</span>
            </button>
          </form>
        </div>

        {/* Lista de Stashes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {stashes.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant/70 italic">
              No hay cambios guardados en Stash
            </div>
          ) : (
            stashes.map((stash) => (
              <div
                key={`${stash.index}-${stash.hash}`}
                className="bg-surface-container-low border border-outline-variant hover:border-outline-variant rounded-lg p-3 flex items-center justify-between transition-colors"
              >
                <div className="truncate pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      stash@&#123;{stash.index}&#125;
                    </span>
                    <span className="text-xs text-on-surface font-medium truncate">{stash.message}</span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant/70 block mt-0.5">
                    {new Date(stash.date).toLocaleString()}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => onPopStash(stash.index)}
                    disabled={loading}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-primary-container/10 hover:bg-primary-container/20 text-primary border border-primary/30 text-xs font-semibold rounded transition-colors disabled:opacity-50"
                    title="Aplicar y eliminar de la lista"
                  >
                    <Play className="w-3 h-3" />
                    <span>Pop</span>
                  </button>
                  <button
                    onClick={() => onDropStash(stash.index)}
                    disabled={loading}
                    className="p-1.5 hover:bg-magma/20 text-on-surface-variant hover:text-error rounded transition-colors disabled:opacity-50"
                    title="Eliminar Stash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
    </ModalCapa>
  );
};

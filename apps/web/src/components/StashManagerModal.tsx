import React, { useState } from 'react';
import { GitStash } from '../types/git';
import { Archive, Plus, Trash2, Play } from 'lucide-react';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { CampoEntrada } from './ui/campo-entrada';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

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
      <ModalEncabezado
        id="titulo-stash"
        titulo="Gestor de Stash"
        subtitulo="Guarda y recupera cambios sin commitear"
        icono={<Archive className="w-4 h-4 text-ember" />}
        onCerrar={onClose}
      />

      <div className="p-4 border-b border-outline-variant bg-surface-container-low/50">
        <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <CampoEntrada
            id="stash-mensaje"
            etiqueta="Mensaje del stash"
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            placeholder="Opcional…"
            className="flex-1"
          />
          <button type="submit" disabled={loading} className={cn(ui.btnPrimario, 'shrink-0')}>
            <Plus className="w-3.5 h-3.5" />
            Guardar Stash
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {stashes.length === 0 ? (
          <div className="text-center py-8 text-code-sm text-on-surface-variant/70 italic">
            No hay cambios guardados en stash
          </div>
        ) : (
          stashes.map((stash) => (
            <div
              key={`${stash.index}-${stash.hash}`}
              className={cn(ui.panelInset, 'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-outline transition-colors group')}
            >
              <div className="truncate min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-code-sm font-bold text-primary">
                    stash@&#123;{stash.index}&#125;
                  </span>
                  <span className="text-code-sm text-on-surface font-medium truncate">{stash.message}</span>
                </div>
                <span className="text-code-sm text-on-surface-variant/70 block mt-0.5 font-mono">
                  {new Date(stash.date).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onPopStash(stash.index)}
                  disabled={loading}
                  className={cn(ui.btnGhost, 'py-1 px-2 text-code-sm')}
                  title="Aplicar y eliminar de la lista"
                >
                  <Play className="w-3 h-3" />
                  Pop
                </button>
                <button
                  type="button"
                  onClick={() => onDropStash(stash.index)}
                  disabled={loading}
                  className={ui.btnIcono}
                  title="Eliminar stash"
                >
                  <Trash2 className="w-3.5 h-3.5 text-error" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ModalCapa>
  );
};

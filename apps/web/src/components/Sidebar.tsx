import React, { useState } from 'react';
import { GitBranch, GitFork, Plus, Tag, ChevronDown, ChevronRight, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { GitBranch as IGitBranch, GitTag } from '../types/git';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';

interface SidebarProps {
  branches: IGitBranch[];
  tags: GitTag[];
  currentBranch: string;
  loading: boolean;
  headDesvinculado?: boolean;
  onCheckout: (branchName: string) => void;
  onCreateBranch: (branchName: string) => void;
  onCreateTag: (tagName: string) => void;
  onDeleteBranch: (branchName: string) => void;
  onRenameBranch: (nombreActual: string, nombreNuevo: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  branches,
  tags,
  currentBranch,
  loading,
  headDesvinculado = false,
  onCheckout,
  onCreateBranch,
  onCreateTag,
  onDeleteBranch,
  onRenameBranch,
}) => {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [remoteExpanded, setRemoteExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName('');
      setShowNewBranchModal(false);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim());
      setNewTagName('');
      setShowNewTagModal(false);
    }
  };

  return (
    <aside className="w-sidebar min-w-[200px] max-w-[280px] shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col h-full select-none max-lg:min-w-[180px]">
      <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
        <span className={ui.labelCaps}>Ramas & Tags</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowNewTagModal(true)}
            className="p-1 hover:bg-surface-container-high text-on-surface-variant hover:text-gold rounded transition-colors"
            title="Crear nuevo tag"
            aria-label="Crear nuevo tag"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNewBranchModal(true)}
            className="p-1 hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded transition-colors"
            title="Crear nueva rama"
            aria-label="Crear nueva rama"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {headDesvinculado && (
        <div className="mx-3 mt-2 px-2.5 py-2 rounded border border-ember/40 bg-ember/10 text-code-sm text-ember leading-snug">
          HEAD desvinculado en <span className="font-mono">{currentBranch}</span>. Haz checkout a una rama (p. ej.{' '}
          <span className="font-mono">main</span>) para volver a una rama nombrada.
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 space-y-3 min-h-0">
        <div>
          <button
            type="button"
            onClick={() => setLocalExpanded(!localExpanded)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-label-md font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors w-full text-left"
            aria-expanded={localExpanded}
          >
            {localExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <GitBranch className="w-3.5 h-3.5 text-primary" />
            <span className={ui.labelCaps}>Locales ({localBranches.length})</span>
          </button>

          {localExpanded && (
            <div className="mt-0.5">
              {localBranches.map((branch) => {
                const isCurrent = branch.current || branch.name === currentBranch;
                return (
                  <div
                    key={branch.name}
                    className={cn(
                      'group flex items-center justify-between pl-4 pr-2 py-1.5 text-label-md transition-colors',
                      isCurrent
                        ? ui.ramaActiva
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 border-l-2 border-transparent'
                    )}
                  >
                    <button
                      type="button"
                      disabled={isCurrent || loading}
                      onClick={() => !isCurrent && !loading && onCheckout(branch.name)}
                      className="truncate text-left flex-1 min-w-0 font-mono text-code-sm disabled:cursor-default"
                    >
                      {branch.name}
                    </button>
                    <div className="flex items-center shrink-0 ml-1 gap-0.5">
                      {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      <button
                        type="button"
                        title="Renombrar rama"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nuevo = window.prompt(`Nuevo nombre para ${branch.name}:`, branch.name);
                          if (nuevo?.trim() && nuevo.trim() !== branch.name) {
                            onRenameBranch(branch.name, nuevo.trim());
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant hover:text-ember"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={isCurrent ? 'No se puede borrar HEAD' : 'Borrar rama local'}
                        disabled={isCurrent}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurrent) onDeleteBranch(branch.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant hover:text-error disabled:opacity-30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setRemoteExpanded(!remoteExpanded)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-label-md font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors w-full text-left"
            aria-expanded={remoteExpanded}
          >
            {remoteExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <GitFork className="w-3.5 h-3.5 text-secondary" />
            <span className={ui.labelCaps}>Remotas ({remoteBranches.length})</span>
          </button>

          {remoteExpanded && (
            <div className="mt-0.5">
              {remoteBranches.map((branch) => (
                <div
                  key={branch.name}
                  className="flex items-center px-4 py-1.5 text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 border-l-2 border-transparent transition-colors"
                >
                  <span className="truncate font-mono text-code-sm">{branch.name.replace('remotes/', '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setTagsExpanded(!tagsExpanded)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-label-md font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors w-full text-left"
            aria-expanded={tagsExpanded}
          >
            {tagsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Tag className="w-3.5 h-3.5 text-gold" />
            <span className={ui.labelCaps}>Tags ({tags.length})</span>
          </button>

          {tagsExpanded && (
            <div className="mt-0.5">
              {tags.length === 0 ? (
                <div className="text-code-sm text-on-surface-variant/60 italic px-4 py-1">Sin tags</div>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.name}
                    className="flex items-center px-4 py-1.5 text-label-md text-gold/90 hover:text-gold hover:bg-surface-container-high/40 border-l-2 border-transparent transition-colors"
                  >
                    <span className="truncate font-mono text-code-sm">{tag.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showNewBranchModal && (
        <ModalCapa ancho="sm" onCerrar={() => setShowNewBranchModal(false)} labelledBy="titulo-nueva-rama">
          <ModalEncabezado
            id="titulo-nueva-rama"
            titulo="Crear nueva rama"
            subtitulo={`Se creará a partir de la posición actual (${currentBranch}).`}
            onCerrar={() => setShowNewBranchModal(false)}
          />
          <form onSubmit={handleCreateBranch} className="p-5 space-y-4">
            <CampoEntrada
              id="nueva-rama"
              etiqueta="Nombre de la rama"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="ej. feature/nueva-vista"
              autoFocus
            />
            <ModalPie
              onCancelar={() => setShowNewBranchModal(false)}
              tipoConfirmar="submit"
              etiquetaConfirmar="Crear rama"
              deshabilitado={!newBranchName.trim() || loading}
            />
          </form>
        </ModalCapa>
      )}

      {showNewTagModal && (
        <ModalCapa ancho="sm" onCerrar={() => setShowNewTagModal(false)} labelledBy="titulo-nuevo-tag">
          <ModalEncabezado
            id="titulo-nuevo-tag"
            titulo="Crear nuevo tag"
            subtitulo="Etiqueta la versión en la posición actual de Git."
            onCerrar={() => setShowNewTagModal(false)}
          />
          <form onSubmit={handleCreateTag} className="p-5 space-y-4">
            <CampoEntrada
              id="nuevo-tag"
              etiqueta="Nombre del tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="ej. v1.0.0"
              autoFocus
            />
            <ModalPie
              onCancelar={() => setShowNewTagModal(false)}
              tipoConfirmar="submit"
              etiquetaConfirmar="Crear tag"
              deshabilitado={!newTagName.trim() || loading}
              varianteConfirmar="secundario"
            />
          </form>
        </ModalCapa>
      )}
    </aside>
  );
};

import React, { useState } from 'react';
import { GitBranch, GitFork, Plus, Tag, ChevronDown, ChevronRight, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { GitBranch as IGitBranch, GitTag } from '../types/git';

interface SidebarProps {
  branches: IGitBranch[];
  tags: GitTag[];
  currentBranch: string;
  loading: boolean;
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
    <aside className="w-64 bg-[#141724] border-r border-[#23283b] flex flex-col h-full select-none">
      {/* Título de Sección y Botón Nueva Rama */}
      <div className="p-3 border-b border-[#23283b] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ramas & Tags</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowNewTagModal(true)}
            className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-amber-400 rounded transition-colors"
            title="Crear Nuevo Tag"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowNewBranchModal(true)}
            className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-emerald-400 rounded transition-colors"
            title="Crear Nueva Rama"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Ramas Locales */}
        <div>
          <div
            onClick={() => setLocalExpanded(!localExpanded)}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer rounded hover:bg-[#1b1f30] transition-colors"
          >
            {localExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>Locales ({localBranches.length})</span>
          </div>

          {localExpanded && (
            <div className="mt-1 space-y-0.5 pl-4">
              {localBranches.map((branch) => {
                const isCurrent = branch.current || branch.name === currentBranch;
                return (
                  <div
                    key={branch.name}
                    onClick={() => !isCurrent && onCheckout(branch.name)}
                    className={`group flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1b1f30]'
                    }`}
                  >
                    <span className="truncate">{branch.name}</span>
                    <div className="flex items-center shrink-0 ml-1 space-x-0.5">
                      {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
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
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-amber-300"
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
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
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

        {/* Ramas Remotas */}
        <div>
          <div
            onClick={() => setRemoteExpanded(!remoteExpanded)}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer rounded hover:bg-[#1b1f30] transition-colors"
          >
            {remoteExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <GitFork className="w-3.5 h-3.5 text-sky-400" />
            <span>Remotas ({remoteBranches.length})</span>
          </div>

          {remoteExpanded && (
            <div className="mt-1 space-y-0.5 pl-4">
              {remoteBranches.map((branch) => (
                <div
                  key={branch.name}
                  className="flex items-center justify-between px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1b1f30] cursor-default transition-colors"
                >
                  <span className="truncate">{branch.name.replace('remotes/', '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <div
            onClick={() => setTagsExpanded(!tagsExpanded)}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer rounded hover:bg-[#1b1f30] transition-colors"
          >
            {tagsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Tags ({tags.length})</span>
          </div>

          {tagsExpanded && (
            <div className="mt-1 space-y-0.5 pl-4">
              {tags.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic px-2">Sin tags</div>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.name}
                    className="flex items-center justify-between px-2 py-1 rounded text-xs text-amber-300/80 hover:text-amber-200 hover:bg-[#1b1f30] transition-colors cursor-default"
                  >
                    <span className="truncate font-mono">{tag.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Rama */}
      {showNewBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1b1f30] border border-[#2e354e] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Crear Nueva Rama</h3>
            <p className="text-xs text-slate-400 mb-4">
              La rama se creará a partir de la posición actual ({currentBranch}).
            </p>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="ej. feature/nueva-vista"
                className="w-full bg-[#141724] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newBranchName.trim() || loading}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 rounded transition-colors disabled:opacity-50"
                >
                  Crear Rama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Tag */}
      {showNewTagModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1b1f30] border border-[#2e354e] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Crear Nuevo Tag</h3>
            <p className="text-xs text-slate-400 mb-4">Etiqueta la versión en la posición actual de Git.</p>
            <form onSubmit={handleCreateTag} className="space-y-4">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="ej. v1.0.0"
                className="w-full bg-[#141724] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewTagModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newTagName.trim() || loading}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded transition-colors disabled:opacity-50"
                >
                  Crear Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

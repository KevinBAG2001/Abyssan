import React from 'react';
import { GitCommit } from '../types/git';
import { GitBranch, Tag, GitPullRequest, Undo2, RotateCcw, ShieldAlert } from 'lucide-react';

interface CommitContextMenuProps {
  commit: GitCommit;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateBranch: (startPoint: string) => void;
  onCreateTag: (hash: string) => void;
  onCherryPick: (hash: string) => void;
  onRevert: (hash: string) => void;
  onReset: (type: 'soft' | 'mixed' | 'hard', hash: string) => void;
}

export const CommitContextMenu: React.FC<CommitContextMenuProps> = ({
  commit,
  position,
  onClose,
  onCreateBranch,
  onCreateTag,
  onCherryPick,
  onRevert,
  onReset,
}) => {
  // Asegurar que el menú no salga de la pantalla
  const menuStyle: React.CSSProperties = {
    top: `${Math.min(position.y, window.innerHeight - 280)}px`,
    left: `${Math.min(position.x, window.innerWidth - 220)}px`,
  };

  return (
    <div
      className="fixed z-50 bg-surface-container border border-outline-variant rounded-xl shadow-2xl p-1.5 w-56 text-xs select-none"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-outline-variant text-[11px] font-mono text-on-surface-variant truncate">
        Commit: <span className="text-primary font-bold">{commit.shortHash}</span>
      </div>

      <div className="py-1 space-y-0.5">
        <button
          onClick={() => {
            onCreateBranch(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-on-surface hover:text-on-surface rounded-md transition-colors text-left"
        >
          <GitBranch className="w-3.5 h-3.5 text-primary" />
          <span>Crear Rama aquí...</span>
        </button>

        <button
          onClick={() => {
            onCreateTag(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-on-surface hover:text-on-surface rounded-md transition-colors text-left"
        >
          <Tag className="w-3.5 h-3.5 text-ember" />
          <span>Crear Tag aquí...</span>
        </button>

        <div className="h-[1px] bg-surface-container-highest my-1" />

        <button
          onClick={() => {
            onCherryPick(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-on-surface hover:text-on-surface rounded-md transition-colors text-left"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-secondary" />
          <span>Cherry-Pick a HEAD</span>
        </button>

        <button
          onClick={() => {
            onRevert(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-on-surface hover:text-on-surface rounded-md transition-colors text-left"
        >
          <Undo2 className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
          <span>Revertir Commit</span>
        </button>

        <div className="h-[1px] bg-surface-container-highest my-1" />

        <button
          onClick={() => {
            onReset('soft', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-ember hover:text-ember rounded-md transition-colors text-left"
        >
          <RotateCcw className="w-3.5 h-3.5 text-ember" />
          <span>Reset Soft (mantener staging)</span>
        </button>

        <button
          onClick={() => {
            onReset('mixed', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-surface-container-highest text-ember hover:text-ember rounded-md transition-colors text-left"
        >
          <RotateCcw className="w-3.5 h-3.5 text-ember" />
          <span>Reset Mixed (conservar working tree)</span>
        </button>

        <button
          onClick={() => {
            onReset('hard', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-magma/20 text-error hover:text-error rounded-md transition-colors text-left"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-error" />
          <span>Reset Hard (descartar todo)</span>
        </button>
      </div>
    </div>
  );
};

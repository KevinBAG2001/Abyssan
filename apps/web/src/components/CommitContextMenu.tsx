import React from 'react';
import { GitCommit } from '../types/git';
import { GitBranch, Tag, GitPullRequest, Undo2, RotateCcw, ShieldAlert } from 'lucide-react';
import { Portal } from './ui/portal';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

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

const itemClase =
  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-code-sm text-left transition-colors';

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
  const menuStyle: React.CSSProperties = {
    top: `${Math.min(position.y, window.innerHeight - 320)}px`,
    left: `${Math.min(position.x, window.innerWidth - 240)}px`,
  };

  return (
    <Portal>
    <div
      role="menu"
      className="fixed z-[150] bg-surface-container border border-outline-variant rounded-lg shadow-2xl p-1.5 w-56 max-w-[calc(100vw-1rem)] text-code-sm select-none font-mono"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-outline-variant mb-1">
        <span className={cn(ui.labelCaps, 'block opacity-70')}>Commit</span>
        <span className="font-mono text-primary font-bold">{commit.shortHash}</span>
        <p className="text-on-surface-variant truncate mt-0.5 normal-case">{commit.message}</p>
      </div>

      <div className="py-0.5 space-y-0.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCreateBranch(commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-on-surface')}
        >
          <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Crear rama aquí…</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCreateTag(commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-on-surface')}
        >
          <Tag className="w-3.5 h-3.5 text-gold shrink-0" />
          <span>Crear tag aquí…</span>
        </button>

        <div className="h-px bg-outline-variant my-1" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCherryPick(commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-on-surface')}
        >
          <GitPullRequest className="w-3.5 h-3.5 text-secondary shrink-0" />
          <span>Cherry-pick a HEAD</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRevert(commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-on-surface')}
        >
          <Undo2 className="w-3.5 h-3.5 text-tertiary-fixed-dim shrink-0" />
          <span>Revertir commit</span>
        </button>

        <div className="h-px bg-outline-variant my-1" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onReset('soft', commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-ember')}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Reset soft</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onReset('mixed', commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-surface-container-highest text-ember')}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Reset mixed</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onReset('hard', commit.hash);
            onClose();
          }}
          className={cn(itemClase, 'hover:bg-magma/15 text-magma border border-transparent hover:border-magma/30')}
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Reset hard</span>
        </button>
      </div>
    </div>
    </Portal>
  );
};

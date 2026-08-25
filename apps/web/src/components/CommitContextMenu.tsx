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
      className="fixed z-50 bg-[#181c2d] border border-[#2e354e] rounded-xl shadow-2xl p-1.5 w-56 text-xs select-none"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-[#23283b] text-[11px] font-mono text-slate-400 truncate">
        Commit: <span className="text-emerald-400 font-bold">{commit.shortHash}</span>
      </div>

      <div className="py-1 space-y-0.5">
        <button
          onClick={() => {
            onCreateBranch(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-slate-200 hover:text-white rounded-md transition-colors text-left"
        >
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <span>Crear Rama aquí...</span>
        </button>

        <button
          onClick={() => {
            onCreateTag(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-slate-200 hover:text-white rounded-md transition-colors text-left"
        >
          <Tag className="w-3.5 h-3.5 text-amber-400" />
          <span>Crear Tag aquí...</span>
        </button>

        <div className="h-[1px] bg-[#23283b] my-1" />

        <button
          onClick={() => {
            onCherryPick(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-slate-200 hover:text-white rounded-md transition-colors text-left"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />
          <span>Cherry-Pick a HEAD</span>
        </button>

        <button
          onClick={() => {
            onRevert(commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-slate-200 hover:text-white rounded-md transition-colors text-left"
        >
          <Undo2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Revertir Commit</span>
        </button>

        <div className="h-[1px] bg-[#23283b] my-1" />

        <button
          onClick={() => {
            onReset('soft', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-amber-300 hover:text-amber-200 rounded-md transition-colors text-left"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Soft (mantener staging)</span>
        </button>

        <button
          onClick={() => {
            onReset('mixed', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-[#23283b] text-amber-300 hover:text-amber-200 rounded-md transition-colors text-left"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Mixed (conservar working tree)</span>
        </button>

        <button
          onClick={() => {
            onReset('hard', commit.hash);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-md transition-colors text-left"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Reset Hard (descartar todo)</span>
        </button>
      </div>
    </div>
  );
};

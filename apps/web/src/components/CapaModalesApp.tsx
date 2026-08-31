import React from 'react';
import { CommitDetailsModal } from './CommitDetailsModal';
import { StashManagerModal } from './StashManagerModal';
import { RemoteManagerModal } from './RemoteManagerModal';
import { BranchCompareModal } from './BranchCompareModal';
import { CommitContextMenu } from './CommitContextMenu';
import { ModalConfirmacion } from './ModalConfirmacion';
import { ModalNacimientoRepo } from './ModalNacimientoRepo';
import { PaletaComandos, type AccionPaleta } from './PaletaComandos';
import { ModalForjas } from './ModalForjas';
import type { ConfirmacionPendiente } from '../application/hooks/useMutacionesGit';
import type { GitBranch, GitCommit, GitRemote, GitStash } from '../types/git';

type CapaModalesAppProps = {
  selectedRepo: string | null;
  selectedCommit: GitCommit | null;
  currentBranch: string;
  branches: GitBranch[];
  stashes: GitStash[];
  remotes: GitRemote[];
  loading: boolean;
  isStashModalOpen: boolean;
  isRemoteModalOpen: boolean;
  isCompareModalOpen: boolean;
  nacimientoAbierto: boolean;
  forjasAbiertas: boolean;
  paletaAbierta: boolean;
  confirmacion: ConfirmacionPendiente | null;
  contextMenu: { commit: GitCommit; position: { x: number; y: number } } | null;
  onCerrarCommit: () => void;
  onCheckout: (target: string) => void;
  onSaveStash: (message?: string) => void;
  onPopStash: (index: number) => void;
  onDropStash: (index: number) => void;
  onCerrarStash: () => void;
  onAddRemote: (name: string, url: string) => void;
  onRemoveRemote: (name: string) => void;
  onFetchAll: () => void;
  onCerrarRemote: () => void;
  onMerge: (sourceBranch: string, noFf: boolean) => void;
  onCerrarCompare: () => void;
  onCerrarNacimiento: () => void;
  onClonado: (path: string) => void;
  onInicializado: (path: string) => void;
  onError: (m: string) => void;
  onCerrarForjas: () => void;
  onExito: (m: string) => void;
  onCheckoutHecho: () => void;
  onCerrarContext: () => void;
  onCreateBranch: (name: string, startPoint?: string) => void;
  onCreateTag: (name: string, hash?: string) => void;
  onCherryPick: (hash: string) => void;
  onRevert: (hash: string) => void;
  onReset: (type: 'soft' | 'mixed' | 'hard', hash: string) => void;
  onCancelarConfirmacion: () => void;
  onConfirmar: () => void;
  onCerrarPaleta: () => void;
  onPaleta: (accion: AccionPaleta) => void;
};

export const CapaModalesApp: React.FC<CapaModalesAppProps> = (p) => (
  <>
    <CommitDetailsModal commit={p.selectedCommit} onClose={p.onCerrarCommit} onCheckout={p.onCheckout} />

    {p.isStashModalOpen && (
      <StashManagerModal
        stashes={p.stashes}
        loading={p.loading}
        onSaveStash={p.onSaveStash}
        onPopStash={p.onPopStash}
        onDropStash={p.onDropStash}
        onClose={p.onCerrarStash}
      />
    )}

    {p.isRemoteModalOpen && (
      <RemoteManagerModal
        remotes={p.remotes}
        loading={p.loading}
        onAddRemote={p.onAddRemote}
        onRemoveRemote={p.onRemoveRemote}
        onFetchAll={p.onFetchAll}
        onClose={p.onCerrarRemote}
      />
    )}

    {p.isCompareModalOpen && p.selectedRepo && (
      <BranchCompareModal
        repoPath={p.selectedRepo}
        branches={p.branches}
        currentBranch={p.currentBranch}
        loading={p.loading}
        onMerge={p.onMerge}
        onClose={p.onCerrarCompare}
      />
    )}

    {p.nacimientoAbierto && (
      <ModalNacimientoRepo
        onClose={p.onCerrarNacimiento}
        onClonado={p.onClonado}
        onInicializado={p.onInicializado}
        onError={p.onError}
      />
    )}

    {p.forjasAbiertas && p.selectedRepo && (
      <ModalForjas
        repoPath={p.selectedRepo}
        ramaActual={p.currentBranch}
        ramas={p.branches}
        onClose={p.onCerrarForjas}
        onError={p.onError}
        onExito={p.onExito}
        onCheckoutHecho={p.onCheckoutHecho}
      />
    )}

    {p.contextMenu && (
      <CommitContextMenu
        commit={p.contextMenu.commit}
        position={p.contextMenu.position}
        onClose={p.onCerrarContext}
        onCreateBranch={(startPoint) => {
          const name = prompt('Nombre de la nueva rama:');
          if (name?.trim()) p.onCreateBranch(name.trim(), startPoint);
        }}
        onCreateTag={(hash) => {
          const name = prompt('Nombre del nuevo tag:');
          if (name?.trim()) p.onCreateTag(name.trim(), hash);
        }}
        onCherryPick={p.onCherryPick}
        onRevert={p.onRevert}
        onReset={p.onReset}
      />
    )}

    {p.confirmacion && (
      <ModalConfirmacion
        titulo={p.confirmacion.titulo}
        descripcion={p.confirmacion.descripcion}
        etiquetaConfirmar={p.confirmacion.etiqueta}
        peligro={p.confirmacion.peligro}
        nombreRequerido={p.confirmacion.nombreRequerido}
        onCancelar={p.onCancelarConfirmacion}
        onConfirmar={p.onConfirmar}
      />
    )}

    <PaletaComandos
      key={p.paletaAbierta ? 'abierta' : 'cerrada'}
      abierta={p.paletaAbierta}
      onCerrar={p.onCerrarPaleta}
      onAccion={p.onPaleta}
    />
  </>
);

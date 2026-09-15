import React from 'react';
import { User, ShieldQuestion } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { useEstadoIdentidad } from './identidad/useEstadoIdentidad';
import { ContenidoFormulario } from './identidad/ContenidoFormulario';

interface ModalIdentidadGitProps {
  repoPath: string;
  onClose: () => void;
  onGuardado: () => void;
  onError: (mensaje: string) => void;
}

export const ModalIdentidadGit: React.FC<ModalIdentidadGitProps> = ({
  repoPath,
  onClose,
  onGuardado,
  onError,
}) => {
  const id = useEstadoIdentidad(repoPath, onGuardado, onClose, onError);

  return (
    <Dialogo onCerrar={onClose} labelledBy="titulo-identidad-git" ancho="md" className="max-w-[480px]">
      <ModalEncabezado
        id="titulo-identidad-git"
        titulo={id.paso === 'confirmar' ? '¿Cambiar la identidad?' : 'Identidad Git'}
        subtitulo={id.paso === 'confirmar' ? 'Confirma antes de escribir user.name y user.email' : 'Autor para commits en este repositorio'}
        icono={id.paso === 'confirmar' ? <ShieldQuestion className="w-4 h-4 text-ember" /> : <User className="w-4 h-4 text-primary" />}
        onCerrar={onClose}
      />

      <form
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (id.guardando) return;
          if (id.paso === 'confirmar') void id.persistir();
          else id.intentarGuardar();
        }}
      >
        <ContenidoFormulario id={id} onClose={onClose} />
      </form>
    </Dialogo>
  );
};

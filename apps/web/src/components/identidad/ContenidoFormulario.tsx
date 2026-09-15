import React from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { ModalPie } from '../ui/modal-pie';
import { cn } from '../../lib/utils';
import { FormularioIdentidad } from './FormularioIdentidad';
import { ConfirmacionIdentidad } from './ConfirmacionIdentidad';

interface EstadoIdentidad {
  nombre: string;
  setNombre: (v: string) => void;
  correo: string;
  setCorreo: (v: string) => void;
  alcance: 'local' | 'global';
  setAlcance: (v: 'local' | 'global') => void;
  alcanceActual: 'local' | 'global' | null;
  avatarBorrador: number;
  setAvatarBorrador: (v: number) => void;
  nombreInicial: string;
  correoInicial: string;
  alcanceInicial: 'local' | 'global';
  cargando: boolean;
  guardando: boolean;
  sinIdentidad: boolean;
  paso: 'editar' | 'confirmar';
  setPaso: (p: 'editar' | 'confirmar') => void;
  hayCambiosCredencial: boolean;
  hayCambiosAvatar: boolean;
  sucio: boolean;
}

interface ContenidoFormularioProps {
  id: EstadoIdentidad;
  onClose: () => void;
}

export const ContenidoFormulario: React.FC<ContenidoFormularioProps> = ({ id, onClose }) => {
  if (id.cargando) {
    return (
      <div className="flex items-center justify-center py-8 text-on-surface-variant/70 text-sm">
        Cargando configuración…
      </div>
    );
  }

  if (id.paso === 'confirmar') {
    return (
      <>
        <ConfirmacionIdentidad
          hayCambiosCredencial={id.hayCambiosCredencial}
          hayCambiosAvatar={id.hayCambiosAvatar}
          nombreInicial={id.nombreInicial}
          correoInicial={id.correoInicial}
          alcanceInicial={id.alcanceInicial}
          nombre={id.nombre}
          correo={id.correo}
          alcance={id.alcance}
        />
        <ModalPie
          onCancelar={() => id.setPaso('editar')}
          etiquetaCancelar="Volver"
          tipoConfirmar="submit"
          etiquetaConfirmar="Aceptar"
          deshabilitado={id.guardando}
          cargando={id.guardando}
          iconoConfirmar={<CheckCircle2 className="w-3.5 h-3.5" />}
          className={cn('-mx-5 -mb-4 px-5')}
        />
      </>
    );
  }

  return (
    <>
      <FormularioIdentidad
        sinIdentidad={id.sinIdentidad}
        alcanceActual={id.alcanceActual}
        sucio={id.sucio}
        nombre={id.nombre}
        correo={id.correo}
        alcance={id.alcance}
        avatarBorrador={id.avatarBorrador}
        onNombre={id.setNombre}
        onCorreo={id.setCorreo}
        onAlcance={id.setAlcance}
        onAvatarBorrador={id.setAvatarBorrador}
      />
      <ModalPie
        onCancelar={onClose}
        etiquetaCancelar={id.sucio || id.sinIdentidad ? 'Cancelar' : 'Cerrar'}
        tipoConfirmar="submit"
        etiquetaConfirmar={id.sinIdentidad ? 'Guardar' : id.sucio ? 'Cambiar identidad' : 'Listo'}
        deshabilitado={id.guardando || !id.nombre.trim() || !id.correo.trim()}
        cargando={id.guardando}
        iconoConfirmar={<Save className="w-3.5 h-3.5" />}
        className={cn('-mx-5 -mb-4 px-5')}
      />
    </>
  );
};

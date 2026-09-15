import React from 'react';
import { AlertTriangle, CheckCircle2, FolderGit2, Globe } from 'lucide-react';
import { CampoEntrada } from '../ui/campo-entrada';
import { Pestannas } from '../ui/pestannas';
import { SelectorAvatar } from '../ui/selector-avatar';
import { ui } from '../../lib/diseno';

interface FormularioIdentidadProps {
  sinIdentidad: boolean;
  alcanceActual: 'local' | 'global' | null;
  sucio: boolean;
  nombre: string;
  correo: string;
  alcance: 'local' | 'global';
  avatarBorrador: number;
  onNombre: (v: string) => void;
  onCorreo: (v: string) => void;
  onAlcance: (v: 'local' | 'global') => void;
  onAvatarBorrador: (v: number) => void;
}

export const FormularioIdentidad: React.FC<FormularioIdentidadProps> = ({
  sinIdentidad,
  alcanceActual,
  sucio,
  nombre,
  correo,
  alcance,
  avatarBorrador,
  onNombre,
  onCorreo,
  onAlcance,
  onAvatarBorrador,
}) => (
  <>
    {sinIdentidad && (
      <div className="flex items-start gap-2 px-3 py-2.5 bg-ember/10 border border-ember/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-ember mt-0.5 shrink-0" />
        <p className="text-xs text-ember/90">
          No hay identidad git configurada. Los commits fallarán hasta que configures nombre y correo.
        </p>
      </div>
    )}

    {alcanceActual && !sinIdentidad && (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary-container/10 border border-primary/20 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-xs text-primary/90">
          Configuración actual: <span className="font-medium">{alcanceActual}</span>
          {!sucio && <span className="text-on-surface-variant/80"> · sin cambios pendientes</span>}
        </p>
      </div>
    )}

    <SelectorAvatar valor={avatarBorrador} onCambiar={onAvatarBorrador} etiqueta={nombre.trim() || 'Yo'} />

    <CampoEntrada
      id="git-nombre"
      etiqueta="Nombre"
      value={nombre}
      onChange={(e) => onNombre(e.target.value)}
      placeholder="Tu nombre (ej: Kevin Austria)"
      autoFocus
    />

    <CampoEntrada
      id="git-correo"
      etiqueta="Correo electrónico"
      type="email"
      value={correo}
      onChange={(e) => onCorreo(e.target.value)}
      placeholder="tu@correo.com"
    />

    <div className="space-y-1.5">
      <span className={ui.labelCaps}>Alcance</span>
      <Pestannas
        activa={alcance}
        onCambiar={(id) => onAlcance(id as 'local' | 'global')}
        pestanas={[
          { id: 'local', etiqueta: 'Solo este repo', icono: <FolderGit2 className="w-3.5 h-3.5" /> },
          { id: 'global', etiqueta: 'Global', icono: <Globe className="w-3.5 h-3.5" /> },
        ]}
      />
      <p className="text-[11px] text-on-surface-variant/70">
        {alcance === 'local'
          ? 'La configuración solo aplica a este repositorio.'
          : 'La configuración aplica a todos los repositorios que no tengan config local.'}
      </p>
    </div>
  </>
);

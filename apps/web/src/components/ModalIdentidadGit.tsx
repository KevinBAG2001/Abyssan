import React, { useState, useEffect } from 'react';
import { User, Save, Globe, FolderGit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';
import { Pestannas } from './ui/pestannas';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

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
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [alcance, setAlcance] = useState<'local' | 'global'>('local');
  const [alcanceActual, setAlcanceActual] = useState<'local' | 'global' | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sinIdentidad, setSinIdentidad] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    const cargar = async () => {
      try {
        const identidad = await httpGitApi.obtenerIdentidad(repoPath);
        if (cancelado) return;
        setNombre(identidad.nombre);
        setCorreo(identidad.correo);
        setAlcanceActual(identidad.alcance);
        setSinIdentidad(!identidad.nombre && !identidad.correo);
      } catch {
        if (cancelado) return;
        setSinIdentidad(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [repoPath]);

  const guardar = async () => {
    if (!nombre.trim() || !correo.trim()) {
      onError('Nombre y correo son requeridos');
      return;
    }
    if (!correo.includes('@')) {
      onError('El correo debe tener un formato válido');
      return;
    }
    setGuardando(true);
    try {
      await httpGitApi.configurarIdentidad(repoPath, nombre.trim(), correo.trim(), alcance === 'global');
      onGuardado();
      onClose();
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al guardar identidad';
      onError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialogo onCerrar={onClose} labelledBy="titulo-identidad-git" ancho="md" className="max-w-[480px]">
      <ModalEncabezado
        id="titulo-identidad-git"
        titulo="Identidad Git"
        subtitulo="Autor para commits en este repositorio"
        icono={<User className="w-4 h-4 text-primary" />}
        onCerrar={onClose}
      />

      <form
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!guardando) void guardar();
        }}
      >
        {cargando ? (
          <div className="flex items-center justify-center py-8 text-on-surface-variant/70 text-sm">
            Cargando configuración…
          </div>
        ) : (
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
                </p>
              </div>
            )}

            <CampoEntrada
              id="git-nombre"
              etiqueta="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre (ej: Kevin Austria)"
              autoFocus
            />

            <CampoEntrada
              id="git-correo"
              etiqueta="Correo electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
            />

            <div className="space-y-1.5">
              <span className={ui.labelCaps}>Alcance</span>
              <Pestannas
                activa={alcance}
                onCambiar={(id) => setAlcance(id as 'local' | 'global')}
                pestanas={[
                  {
                    id: 'local',
                    etiqueta: 'Solo este repo',
                    icono: <FolderGit2 className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'global',
                    etiqueta: 'Global',
                    icono: <Globe className="w-3.5 h-3.5" />,
                  },
                ]}
              />
              <p className="text-[11px] text-on-surface-variant/70">
                {alcance === 'local'
                  ? 'La configuración solo aplica a este repositorio.'
                  : 'La configuración aplica a todos los repositorios que no tengan config local.'}
              </p>
            </div>
          </>
        )}

        {!cargando && (
          <ModalPie
            onCancelar={onClose}
            tipoConfirmar="submit"
            etiquetaConfirmar="Guardar"
            deshabilitado={guardando || !nombre.trim() || !correo.trim()}
            cargando={guardando}
            iconoConfirmar={<Save className="w-3.5 h-3.5" />}
            className={cn('-mx-5 -mb-4 px-5')}
          />
        )}
      </form>
    </Dialogo>
  );
};

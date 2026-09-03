import React, { useState, useEffect } from 'react';
import { User, Mail, X, Save, Globe, FolderGit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { Dialogo } from './ui/dialogo';

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
    <Dialogo
      onCerrar={onClose}
      labelledBy="titulo-identidad-git"
      className="w-[480px] max-w-[95vw] rounded-xl border border-outline-variant bg-surface-container p-0 shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-container/15 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 id="titulo-identidad-git" className="text-sm font-semibold text-on-surface">
              Identidad Git
            </h2>
            <p className="text-[11px] text-on-surface-variant/70">Autor para commits en este repositorio</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-surface-container-highest rounded-md transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>

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

            <div className="space-y-1.5">
              <label htmlFor="git-nombre" className="text-xs font-medium text-on-surface-variant flex items-center gap-1.5">
                <User className="w-3 h-3 text-on-surface-variant/70" />
                Nombre
              </label>
              <input
                id="git-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre (ej: Kevin Austria)"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="git-correo" className="text-xs font-medium text-on-surface-variant flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-on-surface-variant/70" />
                Correo electrónico
              </label>
              <input
                id="git-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-on-surface-variant">Alcance</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAlcance('local')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    alcance === 'local'
                      ? 'bg-primary-container/15 border-primary/40 text-primary'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-[#3e455e]'
                  }`}
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  Solo este repo
                </button>
                <button
                  type="button"
                  onClick={() => setAlcance('global')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                    alcance === 'global'
                      ? 'bg-secondary-container/15 border-secondary/40 text-secondary'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-[#3e455e]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Global (todos los repos)
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant/70">
                {alcance === 'local'
                  ? 'La configuración solo aplica a este repositorio.'
                  : 'La configuración aplica a todos los repositorios que no tengan config local.'}
              </p>
            </div>
          </>
        )}

        {!cargando && (
          <div className="flex items-center justify-end gap-2 -mx-5 -mb-4 px-5 py-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-highest transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !nombre.trim() || !correo.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-container hover:bg-primary-container disabled:opacity-50 disabled:hover:brightness-110 text-on-surface text-xs font-medium rounded-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    </Dialogo>
  );
};

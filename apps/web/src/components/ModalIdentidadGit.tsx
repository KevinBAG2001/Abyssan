import React, { useState, useEffect } from 'react';
import { User, Mail, X, Save, Globe, FolderGit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';

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
    const cargar = async () => {
      try {
        const identidad = await httpGitApi.obtenerIdentidad(repoPath);
        setNombre(identidad.nombre);
        setCorreo(identidad.correo);
        setAlcanceActual(identidad.alcance);
        setSinIdentidad(!identidad.nombre && !identidad.correo);
      } catch (err) {
        setSinIdentidad(true);
      } finally {
        setCargando(false);
      }
    };
    cargar();
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
    } catch (err: any) {
      onError(err.message || 'Error al guardar identidad');
    } finally {
      setGuardando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !guardando) guardar();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#181c2d] border border-[#23283b] rounded-xl shadow-2xl w-[480px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23283b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Identidad Git</h2>
              <p className="text-[11px] text-slate-500">Autor para commits en este repositorio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#23283b] rounded-md transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {cargando ? (
            <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
              Cargando configuración…
            </div>
          ) : (
            <>
              {sinIdentidad && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300/90">
                    No hay identidad git configurada. Los commits fallarán hasta que configures nombre y correo.
                  </p>
                </div>
              )}

              {alcanceActual && !sinIdentidad && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300/90">
                    Configuración actual: <span className="font-medium">{alcanceActual}</span>
                  </p>
                </div>
              )}

              {/* Nombre */}
              <div className="space-y-1.5">
                <label htmlFor="git-nombre" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-500" />
                  Nombre
                </label>
                <input
                  id="git-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre (ej: Kevin Austria)"
                  className="w-full bg-[#0f111a] border border-[#2e354e] rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Correo */}
              <div className="space-y-1.5">
                <label htmlFor="git-correo" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-500" />
                  Correo electrónico
                </label>
                <input
                  id="git-correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#0f111a] border border-[#2e354e] rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Alcance */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Alcance</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAlcance('local')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors ${
                      alcance === 'local'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#0f111a] border-[#2e354e] text-slate-400 hover:border-[#3e455e]'
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
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                        : 'bg-[#0f111a] border-[#2e354e] text-slate-400 hover:border-[#3e455e]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Global (todos los repos)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {alcance === 'local'
                    ? 'La configuración solo aplica a este repositorio.'
                    : 'La configuración aplica a todos los repositorios que no tengan config local.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!cargando && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#23283b]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-md hover:bg-[#23283b] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando || !nombre.trim() || !correo.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { User, Save, Globe, FolderGit2, AlertTriangle, CheckCircle2, ArrowRight, ShieldQuestion } from 'lucide-react';
import { httpGitApi } from '../infrastructure/api/HttpGitApi';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';
import { Pestannas } from './ui/pestannas';
import { SelectorAvatar } from './ui/selector-avatar';
import { leerAvatarId, useAvatarIdentidad } from './ui/avatares-identidad';
import { ui } from '../lib/diseno';
import { cn } from '../lib/utils';

interface ModalIdentidadGitProps {
  repoPath: string;
  onClose: () => void;
  onGuardado: () => void;
  onError: (mensaje: string) => void;
}

type PasoIdentidad = 'editar' | 'confirmar';

export const ModalIdentidadGit: React.FC<ModalIdentidadGitProps> = ({
  repoPath,
  onClose,
  onGuardado,
  onError,
}) => {
  const { setAvatarId } = useAvatarIdentidad();
  const [avatarBorrador, setAvatarBorrador] = useState(leerAvatarId);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [alcance, setAlcance] = useState<'local' | 'global'>('local');
  const [alcanceActual, setAlcanceActual] = useState<'local' | 'global' | null>(null);
  const [nombreInicial, setNombreInicial] = useState('');
  const [correoInicial, setCorreoInicial] = useState('');
  const [alcanceInicial, setAlcanceInicial] = useState<'local' | 'global'>('local');
  const [avatarInicial, setAvatarInicial] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sinIdentidad, setSinIdentidad] = useState(false);
  const [paso, setPaso] = useState<PasoIdentidad>('editar');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    const cargar = async () => {
      try {
        const identidad = await httpGitApi.obtenerIdentidad(repoPath);
        if (cancelado) return;
        const vacia = !identidad.nombre && !identidad.correo;
        const alcanceLeido = identidad.alcance === 'local' ? 'local' : 'global';
        setNombre(identidad.nombre);
        setCorreo(identidad.correo);
        setAlcance(vacia ? 'local' : alcanceLeido);
        setAlcanceActual(vacia ? null : alcanceLeido);
        setNombreInicial(identidad.nombre);
        setCorreoInicial(identidad.correo);
        setAlcanceInicial(alcanceLeido);
        setAvatarInicial(leerAvatarId());
        setAvatarBorrador(leerAvatarId());
        setSinIdentidad(vacia);
        setPaso('editar');
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

  const hayCambiosCredencial =
    nombre.trim() !== nombreInicial.trim() ||
    correo.trim() !== correoInicial.trim() ||
    alcance !== alcanceInicial;
  const hayCambiosAvatar = avatarBorrador !== avatarInicial;
  const sucio = hayCambiosCredencial || hayCambiosAvatar;

  const persistir = async () => {
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
      if (sinIdentidad || hayCambiosCredencial) {
        await httpGitApi.configurarIdentidad(repoPath, nombre.trim(), correo.trim(), alcance === 'global');
      }
      if (hayCambiosAvatar) setAvatarId(avatarBorrador);
      onGuardado();
      onClose();
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al guardar identidad';
      onError(mensaje);
      setPaso('editar');
    } finally {
      setGuardando(false);
    }
  };

  const intentarGuardar = () => {
    if (!nombre.trim() || !correo.trim()) {
      onError('Nombre y correo son requeridos');
      return;
    }
    if (!correo.includes('@')) {
      onError('El correo debe tener un formato válido');
      return;
    }
    if (!sinIdentidad && !sucio) {
      onClose();
      return;
    }
    if (!sinIdentidad && sucio) {
      setPaso('confirmar');
      return;
    }
    void persistir();
  };

  const etiquetaAlcance = (valor: 'local' | 'global') =>
    valor === 'local' ? 'solo este repositorio' : 'global';

  return (
    <Dialogo onCerrar={onClose} labelledBy="titulo-identidad-git" ancho="md" className="max-w-[480px]">
      <ModalEncabezado
        id="titulo-identidad-git"
        titulo={paso === 'confirmar' ? '¿Cambiar la identidad?' : 'Identidad Git'}
        subtitulo={
          paso === 'confirmar'
            ? 'Confirma antes de escribir user.name y user.email'
            : 'Autor para commits en este repositorio'
        }
        icono={
          paso === 'confirmar' ? (
            <ShieldQuestion className="w-4 h-4 text-ember" />
          ) : (
            <User className="w-4 h-4 text-primary" />
          )
        }
        onCerrar={onClose}
      />

      <form
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (guardando) return;
          if (paso === 'confirmar') void persistir();
          else intentarGuardar();
        }}
      >
        {cargando ? (
          <div className="flex items-center justify-center py-8 text-on-surface-variant/70 text-sm">
            Cargando configuración…
          </div>
        ) : paso === 'confirmar' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-ember/10 border border-ember/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-ember mt-0.5 shrink-0" />
              <p className="text-xs text-ember/90 leading-relaxed">
                Los commits ya existentes no cambian. Los siguientes usarán este nombre y correo.
                {alcance === 'global'
                  ? ' El alcance global afecta a todos los repos sin config local (en este entorno Git).'
                  : ' Solo se escribe en este repositorio.'}
              </p>
            </div>
            <dl className="space-y-2 text-xs font-mono">
              {hayCambiosCredencial && (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <dt className="text-on-surface-variant/70 w-16 shrink-0">Antes</dt>
                    <dd className="truncate text-on-surface-variant">
                      {nombreInicial || '—'} · {correoInicial || '—'} · {etiquetaAlcance(alcanceInicial)}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 text-primary">
                    <dt className="w-16 shrink-0 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Nuevo
                    </dt>
                    <dd className="truncate font-medium">
                      {nombre.trim()} · {correo.trim()} · {etiquetaAlcance(alcance)}
                    </dd>
                  </div>
                </>
              )}
              {hayCambiosAvatar && (
                <p className="text-on-surface-variant/80">También se actualizará el avatar de la interfaz.</p>
              )}
            </dl>
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
                  {!sucio && <span className="text-on-surface-variant/80"> · sin cambios pendientes</span>}
                </p>
              </div>
            )}

            <SelectorAvatar valor={avatarBorrador} onCambiar={setAvatarBorrador} etiqueta={nombre.trim() || 'Yo'} />

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

        {!cargando && paso === 'editar' && (
          <ModalPie
            onCancelar={onClose}
            etiquetaCancelar={sucio || sinIdentidad ? 'Cancelar' : 'Cerrar'}
            tipoConfirmar="submit"
            etiquetaConfirmar={
              sinIdentidad ? 'Guardar' : sucio ? 'Cambiar identidad' : 'Listo'
            }
            deshabilitado={guardando || !nombre.trim() || !correo.trim()}
            cargando={guardando}
            iconoConfirmar={<Save className="w-3.5 h-3.5" />}
            className={cn('-mx-5 -mb-4 px-5')}
          />
        )}

        {!cargando && paso === 'confirmar' && (
          <ModalPie
            onCancelar={() => setPaso('editar')}
            etiquetaCancelar="Volver"
            tipoConfirmar="submit"
            etiquetaConfirmar="Aceptar"
            deshabilitado={guardando}
            cargando={guardando}
            iconoConfirmar={<CheckCircle2 className="w-3.5 h-3.5" />}
            className={cn('-mx-5 -mb-4 px-5')}
          />
        )}
      </form>
    </Dialogo>
  );
};

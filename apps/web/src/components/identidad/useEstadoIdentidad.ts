import { useState, useEffect } from 'react';
import { httpGitApi } from '../../infrastructure/api/HttpGitApi';
import { useAvatarIdentidad } from '../ui/avatares-identidad';
import { leerAvatarId } from '../ui/avatares-identidad-datos';

type PasoIdentidad = 'editar' | 'confirmar';

export function useEstadoIdentidad(
  repoPath: string,
  onGuardado: () => void,
  onClose: () => void,
  onError: (mensaje: string) => void,
) {
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
    void (async () => {
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
        if (!cancelado) setSinIdentidad(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [repoPath]);

  const hayCambiosCredencial =
    nombre.trim() !== nombreInicial.trim() ||
    correo.trim() !== correoInicial.trim() ||
    alcance !== alcanceInicial;
  const hayCambiosAvatar = avatarBorrador !== avatarInicial;
  const sucio = hayCambiosCredencial || hayCambiosAvatar;

  const validar = (): boolean => {
    if (!nombre.trim() || !correo.trim()) { onError('Nombre y correo son requeridos'); return false; }
    if (!correo.includes('@')) { onError('El correo debe tener un formato válido'); return false; }
    return true;
  };

  const persistir = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      if (sinIdentidad || hayCambiosCredencial) {
        await httpGitApi.configurarIdentidad(repoPath, nombre.trim(), correo.trim(), alcance === 'global');
      }
      if (hayCambiosAvatar) setAvatarId(avatarBorrador);
      onGuardado();
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Error al guardar identidad');
      setPaso('editar');
    } finally {
      setGuardando(false);
    }
  };

  const intentarGuardar = () => {
    if (!validar()) return;
    if (!sinIdentidad && !sucio) { onClose(); return; }
    if (!sinIdentidad && sucio) { setPaso('confirmar'); return; }
    void persistir();
  };

  return {
    nombre, setNombre,
    correo, setCorreo,
    alcance, setAlcance,
    alcanceActual,
    avatarBorrador, setAvatarBorrador,
    nombreInicial, correoInicial, alcanceInicial,
    cargando, guardando,
    sinIdentidad,
    paso, setPaso,
    hayCambiosCredencial, hayCambiosAvatar, sucio,
    persistir, intentarGuardar,
  };
}

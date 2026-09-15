import { useCallback, useEffect, useId, useState } from 'react';
import {
  avatarPorId,
  leerAvatarId,
  guardarAvatarId,
  EVENTO_AVATAR,
} from './avatares-identidad-datos';

export function useAvatarIdentidad() {
  const [avatarId, setAvatarIdEstado] = useState(leerAvatarId);

  useEffect(() => {
    const sincronizar = () => setAvatarIdEstado(leerAvatarId());
    window.addEventListener(EVENTO_AVATAR, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO_AVATAR, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  const setAvatarId = useCallback((id: number) => {
    guardarAvatarId(id);
    setAvatarIdEstado(id);
  }, []);

  return { avatarId, setAvatarId };
}

export function GlifoAvatar({ id, className }: { id: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const avatar = avatarPorId(id);
  return (
    <span className={className} aria-hidden="true">
      {avatar.svg(`av-${uid}-${avatar.id}`)}
    </span>
  );
}

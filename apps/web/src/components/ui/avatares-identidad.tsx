import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';

export type AvatarIdentidad = {
  id: number;
  etiqueta: string;
  svg: (maskId: string) => ReactNode;
};

const CLAVE = 'abyssan.avatarId';
const EVENTO = 'abyssan-avatar-cambiado';

export const AVATARES_IDENTIDAD: AvatarIdentidad[] = [
  {
    id: 1,
    etiqueta: 'Ember',
    svg: (maskId) => (
      <svg aria-hidden="true" fill="none" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <mask id={maskId} maskUnits="userSpaceOnUse" width="36" height="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect fill="#ff005b" height="36" width="36" />
          <rect fill="#ffb238" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18)" width="36" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000" strokeLinecap="round" />
            <rect fill="#000" height="2" rx="1" width="1.5" x="10" y="14" />
            <rect fill="#000" height="2" rx="1" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 2,
    etiqueta: 'Void',
    svg: (maskId) => (
      <svg aria-hidden="true" fill="none" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <mask id={maskId} maskUnits="userSpaceOnUse" width="36" height="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect fill="#ff7d10" height="36" width="36" />
          <rect fill="#0a0310" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" width="36" />
          <g transform="translate(7 -6) rotate(-5 18 18)">
            <path d="M15 20c2 1 4 1 6 0" fill="none" stroke="#FFF" strokeLinecap="round" />
            <rect fill="#FFF" height="2" rx="1" width="1.5" x="14" y="14" />
            <rect fill="#FFF" height="2" rx="1" width="1.5" x="20" y="14" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 3,
    etiqueta: 'Magma',
    svg: (maskId) => (
      <svg aria-hidden="true" fill="none" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <mask id={maskId} maskUnits="userSpaceOnUse" width="36" height="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect fill="#0a0310" height="36" width="36" />
          <rect fill="#ff005b" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" width="36" />
          <g transform="translate(-3 3.5) rotate(7 18 18)">
            <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFF" />
            <rect fill="#FFF" height="2" rx="1" width="1.5" x="12" y="14" />
            <rect fill="#FFF" height="2" rx="1" width="1.5" x="22" y="14" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 4,
    etiqueta: 'Biolume',
    svg: (maskId) => (
      <svg aria-hidden="true" fill="none" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <mask id={maskId} maskUnits="userSpaceOnUse" width="36" height="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect fill="#d8fcb3" height="36" width="36" />
          <rect fill="#89fcb3" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18)" width="36" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000" strokeLinecap="round" />
            <rect fill="#000" height="2" rx="1" width="1.5" x="10" y="14" />
            <rect fill="#000" height="2" rx="1" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    ),
  },
];

export function avatarPorId(id: number): AvatarIdentidad {
  return AVATARES_IDENTIDAD.find((a) => a.id === id) ?? AVATARES_IDENTIDAD[0];
}

export function leerAvatarId(): number {
  if (typeof window === 'undefined') return 1;
  const n = Number(window.localStorage.getItem(CLAVE));
  return AVATARES_IDENTIDAD.some((a) => a.id === n) ? n : 1;
}

export function guardarAvatarId(id: number): void {
  window.localStorage.setItem(CLAVE, String(id));
  window.dispatchEvent(new Event(EVENTO));
}

export function useAvatarIdentidad() {
  const [avatarId, setAvatarIdEstado] = useState(leerAvatarId);

  useEffect(() => {
    const sincronizar = () => setAvatarIdEstado(leerAvatarId());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
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

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type PortalProps = {
  children: ReactNode;
};

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** Monta hijos en document.body para evitar recorte por ancestros con overflow/transform. */
export function Portal({ children }: PortalProps) {
  const montado = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!montado) return null;
  return createPortal(children, document.body);
}

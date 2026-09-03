import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type PortalProps = {
  children: ReactNode;
};

/** Monta hijos en document.body para evitar recorte por ancestros con overflow/transform. */
export function Portal({ children }: PortalProps) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado) return null;
  return createPortal(children, document.body);
}

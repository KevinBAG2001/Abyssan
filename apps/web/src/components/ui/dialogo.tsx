import { useEffect, useRef, type ReactNode } from 'react';

type DialogoProps = {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onCerrar: () => void;
};

export function Dialogo({ children, className, labelledBy, onCerrar }: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => {
      if (el.open) el.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={className}
      onClose={onCerrar}
    >
      {children}
    </dialog>
  );
}

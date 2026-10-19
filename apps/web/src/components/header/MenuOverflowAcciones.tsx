import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { ui } from '../../lib/diseno';
import { cn } from '../../lib/utils';

export type ItemMenuOverflow = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
};

type MenuOverflowAccionesProps = {
  items: ItemMenuOverflow[];
  className?: string;
};

export function MenuOverflowAcciones({ items, className }: MenuOverflowAccionesProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visibles = items.filter((i) => !i.hidden);
  if (visibles.length === 0) return null;

  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [abierto]);

  return (
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        className={cn(ui.btnSecundario, 'min-w-[44px] min-h-[44px] lg:min-h-0 lg:min-w-0 px-2.5')}
        title="Más acciones"
        aria-label="Más acciones"
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={() => setAbierto((v) => !v)}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] max-h-[min(70dvh,24rem)] overflow-y-auto rounded border border-outline-variant bg-surface-container-low py-1 shadow-xl"
        >
          {visibles.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className="w-full px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-40 min-h-[44px]"
              onClick={() => {
                item.onClick();
                setAbierto(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

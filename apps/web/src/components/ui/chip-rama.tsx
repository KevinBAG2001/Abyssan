import { GitBranch, Tag } from 'lucide-react';
import { ui } from '@/lib/diseno';
import { cn } from '@/lib/utils';

type ChipRamaProps = {
  nombre: string;
  tipo?: 'rama' | 'tag';
  className?: string;
};

/** Chip de rama o tag para grafo e inspector de commit. */
export function ChipRama({ nombre, tipo = 'rama', className }: ChipRamaProps) {
  if (tipo === 'tag') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold border border-gold/30 shrink-0',
          className
        )}
      >
        <Tag className="w-2.5 h-2.5" />
        <span className="truncate max-w-[8rem]">{nombre}</span>
      </span>
    );
  }

  return (
    <span className={cn(ui.chipRama, 'text-[10px] font-bold text-primary bg-primary-container/20 border-primary/30', className)}>
      <GitBranch className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate max-w-[8rem]">{nombre}</span>
    </span>
  );
}

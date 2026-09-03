import logoUrl from '../assets/abyssan-logo.png';
import { cn } from '../lib/utils';

type TamanoLogo = 'sm' | 'md' | 'lg';

const TAMANOS: Record<TamanoLogo, string> = {
  sm: 'h-6',
  md: 'h-7',
  lg: 'h-8',
};

type Props = {
  className?: string;
  alt?: string;
  tamano?: TamanoLogo;
};

/** Logo sonar del kit Stitch — importado por Vite (funciona en dev y Docker). */
export function AbyssanLogo({ className, alt = 'Abyssan', tamano = 'md' }: Props) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn(TAMANOS[tamano], 'w-auto object-contain shrink-0', className)}
      width={32}
      height={32}
      decoding="async"
    />
  );
}

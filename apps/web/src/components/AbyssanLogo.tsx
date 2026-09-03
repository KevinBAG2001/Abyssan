import logoUrl from '../assets/abyssan-logo.png';
import { cn } from '../lib/utils';

type Props = {
  className?: string;
  alt?: string;
};

/** Logo sonar del kit Stitch — importado por Vite (funciona en dev y Docker). */
export function AbyssanLogo({ className, alt = 'Abyssan' }: Props) {
  return <img src={logoUrl} alt={alt} className={cn('h-7 w-auto object-contain', className)} />;
}

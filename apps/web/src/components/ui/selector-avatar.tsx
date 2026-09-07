import { Check } from 'lucide-react';
import { AVATARES_IDENTIDAD, GlifoAvatar, avatarPorId } from './avatares-identidad';
import { cn } from '@/lib/utils';
import { ui } from '@/lib/diseno';

type SelectorAvatarProps = {
  valor: number;
  onCambiar: (id: number) => void;
  etiqueta?: string;
};

/**
 * Selector de avatar compacto (idea Kokonut / 21st.dev, sin Motion ni shadcn).
 * Solo vive en la UI de Abyssan; no se escribe en git config.
 */
export function SelectorAvatar({ valor, onCambiar, etiqueta = 'Yo' }: SelectorAvatarProps) {
  const actual = avatarPorId(valor);

  return (
    <div className="space-y-2">
      <span className={ui.labelCaps}>Avatar en Abyssan</span>
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="size-16 overflow-hidden rounded-full ring-2 ring-primary/50 shadow-[0_0_16px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]">
            <GlifoAvatar id={valor} className="block size-16 [&_svg]:size-full" />
          </div>
          <span className="text-[11px] text-on-surface font-medium">{etiqueta}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-on-surface-variant/80 mb-2">
            Elige un avatar. No se guarda en Git; solo se ve en esta app.
          </p>
          <div className="flex flex-wrap gap-2" role="listbox" aria-label="Avatares">
            {AVATARES_IDENTIDAD.map((avatar) => {
              const seleccionado = avatar.id === valor;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  role="option"
                  aria-selected={seleccionado}
                  aria-label={avatar.etiqueta}
                  onClick={() => onCambiar(avatar.id)}
                  className={cn(
                    'relative size-11 overflow-hidden rounded-full border transition-transform duration-150',
                    'motion-reduce:transition-none hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    seleccionado
                      ? 'border-on-surface ring-2 ring-on-surface/80 opacity-100'
                      : 'border-outline-variant opacity-55 hover:opacity-100'
                  )}
                >
                  <GlifoAvatar id={avatar.id} className="block size-11 [&_svg]:size-full" />
                  {seleccionado && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-on-surface">
                      <Check className="size-2.5 text-void" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-on-surface-variant/60 mt-1.5 uppercase tracking-wider">{actual.etiqueta}</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Dialogo } from './ui/dialogo';
import { ModalEncabezado } from './ui/modal-encabezado';
import { CampoEntrada } from './ui/campo-entrada';
import { ui } from '../lib/diseno';

type ModalSesionInstanciaProps = {
  error?: string | null;
  cargando?: boolean;
  onAbrir: (token: string) => Promise<boolean>;
};

export const ModalSesionInstancia: React.FC<ModalSesionInstanciaProps> = ({
  error,
  cargando = false,
  onAbrir,
}) => {
  const [token, setToken] = useState('');

  return (
    <Dialogo onCerrar={() => undefined} labelledBy="titulo-sesion-instancia" ancho="sm">
      <ModalEncabezado
        id="titulo-sesion-instancia"
        titulo="Token de instancia"
        subtitulo="Esta instancia no está en loopback y exige autenticación"
        icono={<KeyRound className="w-4 h-4 text-ember" />}
        onCerrar={() => undefined}
      />
      <form
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!token.trim() || cargando) return;
          void onAbrir(token.trim());
        }}
      >
        <p className="text-code-sm text-on-surface-variant leading-relaxed">
          Introduce el valor de <span className="font-mono">ABYSSAN_API_TOKEN</span> del servidor.
          No se guarda en el bundle ni en localStorage.
        </p>
        <CampoEntrada
          id="token-instancia"
          etiqueta="Token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          ayuda="El mismo secreto que definiste en el entorno del API."
        />
        {error && <p className="text-code-sm text-error">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" className={ui.btnPrimario} disabled={!token.trim() || cargando}>
            {cargando ? 'Abriendo sesión…' : 'Abrir sesión'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
};

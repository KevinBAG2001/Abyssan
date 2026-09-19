import { useCallback, useEffect, useState } from 'react';
import { httpGitApi } from '../../infrastructure/api/HttpGitApi.js';

export function useSesionInstancia() {
  const [lista, setLista] = useState(false);
  const [requiereToken, setRequiereToken] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abrir = useCallback(async (token?: string) => {
    setCargando(true);
    setError(null);
    try {
      const estado = await httpGitApi.abrirSesion(token);
      setRequiereToken(Boolean(estado.requiereToken) && !estado.activa);
      setLista(Boolean(estado.activa));
      return estado.activa;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo abrir la sesión';
      setError(token ? mensaje : null);
      setRequiereToken(true);
      setLista(false);
      return false;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      setCargando(true);
      try {
        const estado = await httpGitApi.obtenerEstadoSesion();
        if (!vivo) return;
        if (estado.activa) {
          setLista(true);
          setRequiereToken(false);
          return;
        }
        if (estado.requiereToken) {
          setRequiereToken(true);
          return;
        }
        await abrir();
      } catch {
        if (vivo) {
          setRequiereToken(true);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [abrir]);

  return { lista, requiereToken, cargando, error, abrir };
}

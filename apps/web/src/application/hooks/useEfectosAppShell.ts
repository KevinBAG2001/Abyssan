import { useEffect } from 'react';
import type { GitOperacion } from '../../types/git';

export function useEfectosAppShell({
  operaciones,
  onAbrirConsola,
  showToast,
  onStageAll,
  onAbrirPaleta,
}: {
  operaciones: GitOperacion[];
  onAbrirConsola: () => void;
  showToast: (mensaje: string, tipo: 'success' | 'error') => void;
  onStageAll: () => void | Promise<void>;
  onAbrirPaleta: () => void;
}) {
  useEffect(() => {
    if (operaciones.some((o) => o.estado === 'en_cola' || o.estado === 'corriendo')) {
      onAbrirConsola();
    }
  }, [operaciones, onAbrirConsola]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('oauth') === 'ok') showToast('Cuenta de forja conectada', 'success');
    if (q.get('oauth') === 'error') showToast('OAuth falló. Revisa las credenciales de la forja.', 'error');
    if (q.has('oauth')) window.history.replaceState({}, '', window.location.pathname);
  }, [showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        void onStageAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        onAbrirPaleta();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStageAll, onAbrirPaleta]);
}

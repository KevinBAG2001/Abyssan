/**
 * Máquina de handshake WebSocket.
 * El token LAN no viaja en la query: primer mensaje AUTH, luego WATCH_REPO.
 */
export type AccionSesionWs =
  | { tipo: 'auth_ok' }
  | { tipo: 'cerrar'; codigo: number; razon: string }
  | { tipo: 'error'; message: string }
  | { tipo: 'vigilar'; repoPath: string }
  | { tipo: 'ignorar' };

export class MaquinaSesionWs {
  autenticado: boolean;

  constructor(private readonly tokenObligatorio: boolean) {
    this.autenticado = !tokenObligatorio;
  }

  procesar(data: unknown, tokenEsValido: (token?: string | null) => boolean): AccionSesionWs {
    if (!data || typeof data !== 'object') {
      return { tipo: 'ignorar' };
    }
    const mensaje = data as { type?: unknown; token?: unknown; repoPath?: unknown };

    if (mensaje.type === 'AUTH') {
      const token = typeof mensaje.token === 'string' ? mensaje.token : undefined;
      if (!this.tokenObligatorio) {
        this.autenticado = true;
        return { tipo: 'auth_ok' };
      }
      if (!tokenEsValido(token)) {
        return { tipo: 'cerrar', codigo: 4401, razon: 'Token de instancia requerido' };
      }
      this.autenticado = true;
      return { tipo: 'auth_ok' };
    }

    if (mensaje.type === 'WATCH_REPO') {
      if (!this.autenticado) {
        return { tipo: 'cerrar', codigo: 4401, razon: 'Token de instancia requerido' };
      }
      if (typeof mensaje.repoPath !== 'string' || !mensaje.repoPath) {
        return { tipo: 'error', message: 'Ruta de repositorio no autorizada' };
      }
      return { tipo: 'vigilar', repoPath: mensaje.repoPath };
    }

    return { tipo: 'ignorar' };
  }
}

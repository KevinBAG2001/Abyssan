/**
 * Identificador de sesión de corta duración (no el token permanente).
 * Vive solo en memoria del tab: no se embebe en el bundle de Vite.
 */
let idSesionMemoria: string | undefined;

export function guardarIdSesionCliente(id?: string): void {
  idSesionMemoria = id;
}

export function obtenerIdSesionCliente(): string | undefined {
  return idSesionMemoria;
}

export function borrarIdSesionCliente(): void {
  idSesionMemoria = undefined;
}

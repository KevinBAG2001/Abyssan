const MENSAJE = 'Confirmación requerida para esta operación destructiva';

export function mensajeConfirmacionRequerida(): string {
  return MENSAJE;
}

export function exigirConfirmacion(confirmado: unknown): void {
  if (confirmado !== true) {
    throw new Error(MENSAJE);
  }
}

/** Fallo de GitHub/GitLab. No debe mezclarse con errores de git local. */
export class ErrorForja extends Error {
  readonly codigoHttp: number;

  constructor(mensaje: string, codigoHttp = 503) {
    super(mensaje);
    this.name = 'ErrorForja';
    this.codigoHttp = codigoHttp;
  }
}

export const MENSAJE_FORJA_CAIDA =
  'La forja no responde. Commit y push locales siguen disponibles.';

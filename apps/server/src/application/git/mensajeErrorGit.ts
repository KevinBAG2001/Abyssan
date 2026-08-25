/**
 * Traduce errores típicos de git (auth, red, permisos) a un mensaje usable en toast.
 */
export function mensajeErrorGit(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Error interno del servidor';
  if (
    /authentication failed|could not read Username|Invalid username|401 Unauthorized|403 Forbidden|Access denied/i.test(
      mensaje
    )
  ) {
    return 'Autenticación Git fallida. Conecta GitHub/GitLab (OAuth) o revisa el acceso.';
  }
  if (/Permission denied \(publickey\)|Could not read from remote repository/i.test(mensaje)) {
    return 'SSH rechazó la clave. Revisa el agent SSH o clona por HTTPS con OAuth.';
  }
  if (
    /Could not resolve host|ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|network is unreachable|Failed to connect/i.test(
      mensaje
    )
  ) {
    return 'No se pudo contactar el remoto. Revisa la red y la URL.';
  }
  if (/already exists/i.test(mensaje)) {
    return 'Esa carpeta o referencia ya existe.';
  }
  if (/not something we can merge|refusing to merge unrelated histories/i.test(mensaje)) {
    return 'Git no pudo fusionar: historias no relacionadas o referencia inválida.';
  }
  return mensaje;
}

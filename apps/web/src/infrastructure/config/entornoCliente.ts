const envPublico = import.meta.env as Record<string, string | undefined>;

/**
 * Token de instancia LAN (D15). Vite solo expone variables VITE_*;
 * la SPA lo envía al API/WS. No es un secreto de usuario.
 */
// react-doctor-disable-next-line react-doctor/public-env-secret-name
export const tokenInstanciaCliente = envPublico.VITE_ABYSSAN_API_TOKEN;

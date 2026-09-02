/**
 * Token de instancia LAN (D15). Vite solo expone variables VITE_*;
 * la SPA lo envía al API/WS. No es un secreto de usuario.
 *
 * Acceso estático para que Vite sustituya el valor en build y el
 * nombre de la variable no quede en el artefacto del navegador.
 */
// react-doctor-disable-next-line react-doctor/public-env-secret-name
export const tokenInstanciaCliente = import.meta.env.VITE_ABYSSAN_API_TOKEN;

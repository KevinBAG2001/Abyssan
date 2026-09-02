# Política de seguridad

## Propósito

Este documento describe cómo reportar vulnerabilidades de **Abyssan**, qué entra en el alcance de seguridad y qué queda fuera. No es una certificación de que el software sea seguro.

Abyssan ejecuta Git sobre el filesystem de la máquina que lo hospeda. Una instancia mal configurada o expuesta a una red no confiable puede leer o modificar repositorios bajo `PROJECTS_ROOT`.

## Versiones soportadas

Abyssan declara `1.0.0` en `package.json` con `"private": true`. **No** hay un canal de release estable documentado.

| Versión / rama | Revisión de seguridad |
|----------------|------------------------|
| Rama principal más reciente del repositorio (`main`, según el remoto público) | Recibe revisión cuando se reporta un problema |
| Tags / releases históricos | No hay política de parches para versiones antiguas: el proyecto no publica un esquema de soporte LTS |
| Forks y copias locales no actualizadas | Fuera de soporte |

## Alcance

Se aceptan reportes, entre otros, sobre:

- Acceso a rutas fuera de `PROJECTS_ROOT`.
- Path traversal y evasión de `validarRutaRepositorio` / `validarRutaArchivoEnRepositorio` (incluidos symlinks).
- Ejecución arbitraria de comandos o inyección de argumentos Git más allá de simple-git.
- Exposición de secretos, tokens OAuth, `ABYSSAN_API_TOKEN` o claves en API, UI, logs, WebSocket o artefactos.
- Filtrado de diffs o contenido sensible en auditoría, journal HTTP o eventos WS.
- Operaciones destructivas alcanzables sin la confirmación que la UI pretende (si el bypass es explotable desde un cliente no controlado).
- Acceso WebSocket no autorizado o evasión de la validación de `WATCH_REPO`.
- Vulnerabilidades en endpoints HTTP (IDOR entre repos bajo la misma raíz, SSRF en clientes de forja, etc.).
- Configuración insegura de Docker (bind `0.0.0.0`, token por defecto, volúmenes demasiado amplios).
- XSS u otras fallas web **directamente explotables** en la SPA contra el operador local.

## Fuera de alcance

- Uso como host público de Git o como GitHub/GitLab.
- Amenazas que requieren ya ser el usuario del sistema operativo con los mismos permisos que el proceso Node.
- Compromiso del agente SSH o del credential helper del sistema.
- Dependencias CVE sin un escenario aplicable a Abyssan.
- Roadmap no implementado (worktrees, usuarios/roles, plugins, Tauri, IA).
- Ingeniería social, phishing al operador o mal uso deliberado de `PROJECTS_ROOT` demasiado amplio.

## Canal privado de reporte

**No publiques vulnerabilidades en Issues, Discussions, Pull Requests, commits ni otros canales públicos.**

El canal principal es **GitHub Private Vulnerability Reporting** en el repositorio:

https://github.com/KevinBAG2001/Abyssan

El propietario debe **habilitar** esa función en Settings → Code security. Hasta que esté activa, un reporte público no es un canal aceptable; espera a que el aviso privado exista o contacta al owner por un medio que no deje el detalle en el historial público.

No hay una dirección de correo institucional publicada en este repositorio; no se inventa una.

## Información requerida

1. Título breve y tipo de impacto (lectura fuera de raíz, RCE, filtrado de token, etc.).
2. Versión o commit (`git rev-parse HEAD`) y sistema operativo.
3. Configuración relevante **sin secretos**: `BIND_HOST`, si hay token, si usas Docker. Redacta tokens.
4. Pasos para reproducir.
5. Resultado observado vs esperado.
6. Si el worktree o `PROJECTS_ROOT` quedan alterados.
7. Mitigación temporal si la conoces.

## Ejemplo de reporte

```text
Título: Symlink bajo PROJECTS_ROOT permite leer un archivo fuera de la raíz vía GET /api/git/diff

Commit: <hash>
SO: Windows 10
BIND_HOST=127.0.0.1 (sin token)

Pasos:
1. Crear un symlink dentro de PROJECTS_ROOT que apunta a <ruta fuera>.
2. Llamar GET /api/git/diff?path=...&file=...

Observado: se devuelve contenido fuera de la raíz.
Esperado: 403.

Adjunto: captura del envelope { exito: false } redactada; sin tokens.
```

## Divulgación coordinada

1. El reportero usa Private Vulnerability Reporting.
2. El responsable confirma recepción cuando pueda; **no hay SLA de horas o días publicado**.
3. Se valida el hallazgo en el código o en una reproducción controlada.
4. Se prepara un arreglo en privado si procede.
5. Se divulga de forma coordinada (notas en el repo o advisory de GitHub) cuando el parche esté disponible o se acuerde que el riesgo es aceptable.

No se ofrece recompensa económica. Un reconocimiento en notas de seguridad es opcional y a criterio del responsable.

## Política de reconocimiento

Se puede mencionar el handle de GitHub del reportero si:

- el reporte fue de buena fe,
- no se explotó de forma pública antes del arreglo, y
- el reportero lo desea.

No hay hall of fame formal.

## Buenas prácticas para quien opera Abyssan

- Deja `BIND_HOST=127.0.0.1` salvo que entiendas el modelo LAN.
- Si no es loopback: define un `ABYSSAN_API_TOKEN` fuerte y el mismo valor en `VITE_ABYSSAN_API_TOKEN`.
- `PROJECTS_ROOT` = solo las carpetas de repos necesarias.
- No subas `.env`, `~/.abyssan/clave` ni `credenciales.enc`.
- En Docker: define `ABYSSAN_API_TOKEN` en `.env` (Compose **no** trae un default). Publica puertos solo en `127.0.0.1`. Acota `ABYSSAN_PROJECTS_HOST`.
- Trata la SPA como un cliente con el mismo poder que el API: curl sin Origin sigue pudiendo mutar en localhost; el navegador cruzado ya no.

## Docker

Ver [documents/wiki/Despliegue-con-Docker.md](documents/wiki/Despliegue-con-Docker.md). Compose de desarrollo: `pnpm dev` en el contenedor, `USER node`, `healthcheck` HTTP, token obligatorio sin default, volumen por defecto el checkout (no el padre). El proceso interno escucha `0.0.0.0`; el host mapea `127.0.0.1`.

## Limitaciones del modelo actual

- Diseñado para **uso local** (un operador, localhost). No hay cuentas de usuario de Abyssan.
- Sin `Origin`, un cliente en la misma máquina (curl, malware con el mismo usuario OS) puede llamar al API. Eso está fuera de alcance si el atacante ya es el usuario del proceso.
- El token de Vite (`VITE_ABYSSAN_API_TOKEN`) viaja en el bundle de la SPA.
- El journal y los snapshots viven en disco local; no son un backup cifrado de grado empresarial.
- Preview de rebase y force-push no está implementado en el caso de uso (el controlador lista esos nombres).
- Compose sigue siendo desarrollo, no Fase 6 (producción multi-usuario).

Abyssan **no** es “completamente seguro”.

## Idiomas

Se aceptan reportes en **español** o **inglés**.

## Documentación técnica

El modelo de amenaza y los controles de implementación están en [documents/wiki/Seguridad.md](documents/wiki/Seguridad.md).

# Contribución

Cómo proponer cambios a Abyssan. El repositorio público está en https://github.com/KevinBAG2001/Abyssan

## Qué se espera

- Un camino Git y un cliente HTTP.
- pnpm.
- Español en UI y mensajes.
- Sin secretos en el diff.
- Tests para validadores y mutaciones nuevas cuando sea razonable.
- Documentación de API si cambian rutas.

## Flujo de ramas

**Recomendación** (documentada en `docs/GITHUB-SEGURIDAD.md`, no aplicada automáticamente por este repo):

```text
feature/…  →  dev  →  qa  →  main
```

CI se dispara en `main`, `qa`, `dev` y en pull requests. No hay un archivo `CONTRIBUTING` previo ni un required-review en el código. Tratar `main`/`qa`/`dev` como ramas protegidas es una **configuración manual de GitHub**, no un requisito que el árbol de fuentes pueda imponer.

## Pull requests

Información útil en la descripción:

1. Qué problema cierra y qué fase del [Roadmap](./Roadmap.md) toca.
2. Lista de rutas HTTP o operaciones Git afectadas.
3. Cómo probarlo (`pnpm test`, pasos manuales en localhost:5174).
4. Confirmación de que no se opera fuera de `PROJECTS_ROOT` y de que no se añadieron secretos.
5. Capturas o notas si hay UI.

El responsable del repo no fusiona PRs de forks sin revisión (política de GitHub Settings; ver `docs/GITHUB-SEGURIDAD.md`).

## Qué no enviar

- Dependencias nuevas sin justificación.
- Un segundo `api.ts`.
- IA / envío de diffs a un LLM.
- Worktrees, plugins, Tauri, auth de usuarios: están en fases posteriores.
- `npm install` ni lockfiles ajenos a pnpm.

## Seguridad

Vulnerabilidades: [SECURITY.md](../../SECURITY.md). No las describas con PoC en un Issue público.

## Licencia

Al contribuir aceptas que el código se distribuye bajo [MIT](../../LICENSE).

## Siguiente

- [Desarrollo y calidad](./Desarrollo-y-calidad.md)
- [Home](./Home.md)

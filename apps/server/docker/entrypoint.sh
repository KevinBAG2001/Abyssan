#!/bin/sh
# Arranque del API en Docker. En bind mounts Windows/macOS, .git/objects puede
# ser 777 y sus subcarpetas XX/ 755 root:root: `git add` falla al escribir el blob.
# Si node no puede escribir en esas fan-out, Git corre como root en el contenedor
# (sigue acotado a PROJECTS_ROOT y al token LAN). No se hace chown del host.
set -e

git config --system --add safe.directory '*' >/dev/null 2>&1 || true

correr_como_node() {
  if command -v su-exec >/dev/null 2>&1; then
    exec su-exec node "$@"
  fi
  exec "$@"
}

probar_escritura() {
  dir="$1"
  [ -d "$dir" ] || return 1
  f="$dir/.abyssan-wprobe-$$"
  if su-exec node sh -c "touch \"$f\"" 2>/dev/null; then
    rm -f "$f"
    return 0
  fi
  rm -f "$f" 2>/dev/null || true
  return 1
}

primer_objects() {
  raiz="$1"
  if [ -d "$raiz/.git/objects" ]; then
    printf '%s\n' "$raiz/.git/objects"
    return 0
  fi
  found="$(find "$raiz" -mindepth 2 -maxdepth 3 -type d -path '*/.git/objects' 2>/dev/null | head -n 1)"
  if [ -n "$found" ]; then
    printf '%s\n' "$found"
    return 0
  fi
  return 1
}

fanout_escribible_por_node() {
  objects="$1"
  probar_escritura "$objects" || return 1
  for d in "$objects"/??; do
    [ -d "$d" ] || continue
    probar_escritura "$d" || return 1
  done
  return 0
}

volumen_escribible_por_node() {
  raiz="${PROJECTS_ROOT:-/workspace/proyectos}"
  [ -d "$raiz" ] || return 0
  command -v su-exec >/dev/null 2>&1 || return 1

  objects="$(primer_objects "$raiz" || true)"
  if [ -n "$objects" ]; then
    if fanout_escribible_por_node "$objects"; then
      return 0
    fi
    return 1
  fi
  if probar_escritura "$raiz"; then
    return 0
  fi
  return 1
}

if [ "$(id -u)" = "0" ]; then
  if volumen_escribible_por_node; then
    echo "[Abyssan] Volumen de repos escribible por node; el API baja privilegio."
    correr_como_node "$@"
  fi
  echo "[Abyssan] El volumen de repos no es escribible por node; Git corre como root en el contenedor (stage/commit/push)."
fi

exec "$@"

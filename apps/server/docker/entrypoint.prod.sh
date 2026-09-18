#!/bin/sh
# Producción: el proceso ya corre como node. Solo marca safe.directory
# del PROJECTS_ROOT explícito. Sin wildcard y sin escalada a root.
set -e
raiz="${PROJECTS_ROOT:-/workspace/proyectos}"
git config --global --add safe.directory "$raiz" >/dev/null 2>&1 || true
exec node dist/index.js

#!/usr/bin/env bash
#
# Fa la cosa: baixa el que falti de la XEMA, passa el control de qualitat,
# calcula i escriu site/data/. Idempotent i incremental.
#
#   ./dothething.sh                    tot, incremental
#   ./dothething.sh --full             ignora el cache i ho refà de zero
#   ./dothething.sh --stations WU,UP   nomes aquestes estacions (proves rapides)
#   ./dothething.sh --serve            serveix site/ a http://localhost:8000
#   ./dothething.sh --test             corre els tests de fixtures
#
# Si tens un app token de Socrata, exporta SOCRATA_APP_TOKEN abans de cridar-lo.

set -euo pipefail
cd "$(dirname "$0")"

VENV=".venv"
STAMP="$VENV/.requirements-stamp"

if [ ! -d "$VENV" ]; then
  echo "==> creant entorn virtual"
  python3 -m venv "$VENV"
fi

# Reinstal.la nomes si requirements.txt ha canviat.
if [ ! -f "$STAMP" ] || ! shasum requirements.txt | cmp -s - "$STAMP"; then
  echo "==> instal.lant dependencies"
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r requirements.txt
  shasum requirements.txt > "$STAMP"
fi

if [ "${1:-}" = "--test" ]; then
  shift
  exec "$VENV/bin/python" -m pytest tests/ -v "$@"
fi

exec "$VENV/bin/python" -m pipeline.run "$@"

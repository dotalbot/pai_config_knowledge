#!/usr/bin/env bash
# Headless Excalidraw renderer.
#   render.sh <in.excalidraw> <out.svg|out.png>
# No Chromium, no native build. Embeds the real Excalifont.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IN="${1:?usage: render.sh <in.excalidraw> <out.svg|out.png>}"
OUT="${2:?usage: render.sh <in.excalidraw> <out.svg|out.png>}"
case "$OUT" in
  *.svg) FMT=svg ;;
  *.png) FMT=png ;;
  *) echo "output must end in .svg or .png" >&2; exit 2 ;;
esac
exec "$DIR/node_modules/.bin/excalidraw-cli" convert "$IN" --format "$FMT" -o "$OUT"

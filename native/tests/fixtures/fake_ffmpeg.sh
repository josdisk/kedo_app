#!/usr/bin/env bash
# Demo fixture: pretends to be ffmpeg for proxy encode + scrub unit tests.
# Never modifies the -i source.
set -euo pipefail
src=""
out=""
prev=""
for arg in "$@"; do
  if [[ "$prev" == "-i" ]]; then
    src="$arg"
    prev=""
    continue
  fi
  case "$arg" in
    -*) prev="$arg" ;;
    *)
      out="$arg"
      prev=""
      ;;
  esac
done
if [[ -z "$src" || -z "$out" ]]; then
  echo "fake_ffmpeg: missing -i or output" >&2
  exit 2
fi
if [[ ! -f "$src" ]]; then
  echo "fake_ffmpeg: source missing: $src" >&2
  exit 1
fi
mkdir -p "$(dirname "$out")"
case "$out" in
  *.ppm|*.PPM)
    printf 'P3\n2 2\n255\n255 0 0  0 255 0\n0 0 255  255 255 0\n' > "$out"
    ;;
  *)
    printf 'ftypisomfake-proxy-demo' > "$out"
    ;;
esac
exit 0

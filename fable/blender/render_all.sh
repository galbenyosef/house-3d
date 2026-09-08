#!/usr/bin/env bash
# Render the Cycles 360° panoramas for one or more styles.
#   bash blender/render_all.sh [res] [samples] [style ...]  (npm run pano -- 3072 96 modern)
# With no styles, use every exported scene in .scratch/export/*.glb.
# Export first: await __app.exportScene() in the development page console.
# Previews use macOS sips; Blender is resolved from PATH or BLENDER_BIN.
set -u
cd "$(dirname "$0")/.."
B=${BLENDER_BIN:-blender}
RES=${1:-3072}; SAMPLES=${2:-96}
shift $(( $# < 2 ? $# : 2 ))
STYLES=("$@")
if (( ${#STYLES[@]} == 0 )); then
  shopt -s nullglob
  for scene in .scratch/export/*.glb; do
    STYLES+=("$(basename "$scene" .glb)")
  done
  shopt -u nullglob
fi
# Same brightness for every style, matching the source project's render settings.
COMMON=(--res "$RES" --samples "$SAMPLES" --world 0.35 --sun 0.3 --lamp 0.05 --exposure -1.0)
# room     cam x y z (three.js metres: x east, y up, z south)   default yaw
ROOMS=(
  "living   2.0  1.45 9.4   0"
  "lounge   2.3  1.40 12.6  -90"
  "master   6.2  1.40 13.0  180"
  "bed1     5.45 1.40 2.7   110"
  "bed2     5.6  1.40 7.6   180"
  "study    3.4  1.40 2.2   180"
  "kitchen  1.9  1.45 4.9   -135"
)
mkdir -p public/pano
for style in "${STYLES[@]}"; do
  if [[ ! -f .scratch/export/$style.glb || ! -f .scratch/export/$style.json ]]; then
    echo "SKIP $style: .scratch/export/$style.{glb,json} missing — export it from the page first"
    continue
  fi
  for spec in "${ROOMS[@]}"; do
    read -r room x y z yaw <<< "$spec"
    case "$style:$room" in
      italian:master|modern:master|song:master) yaw=-90 ;;
    esac
    out=public/pano/$style-$room.jpg
    echo "START $style $room yaw $yaw $(date +%H:%M:%S)"
    "$B" -b --python blender/render_pano.py -- ".scratch/export/$style.glb" ".scratch/export/$style.json" "$out" \
      --cam "$x" "$y" "$z" --yaw "$yaw" "${COMMON[@]}" > ".scratch/pano_$style-$room.log" 2>&1
    grep -h "RENDER done\|Traceback" ".scratch/pano_$style-$room.log"
    [[ -f $out ]] && sips -Z 1024 "$out" --out "public/pano/$style-$room-preview.jpg" > /dev/null
  done
done
echo ALL_DONE

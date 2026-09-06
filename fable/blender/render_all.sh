#!/usr/bin/env bash
# Render every panorama for both styles. Usage: blender/render_all.sh [res] [samples]
set -euo pipefail
cd "$(dirname "$0")/.."
B=${BLENDER_BIN:-blender}
RES=${1:-3072}; SAMPLES=${2:-96}
COMMON=(--res "$RES" --samples "$SAMPLES" --world 0.35 --sun 0.3 --lamp 0.05 --exposure -1.0)
# room  cam(x y z, three.js metres)  yaw(french)  yaw(italian)
ROOMS=(
  "living   2.0 1.45 9.4   0    0"
  "lounge   2.3 1.40 12.6  -90  -90"
  "master   6.2 1.40 13.0  180  -90"
  "bed2     5.6 1.40 7.6   180  180"
  "study    3.4 1.40 2.2   180  180"
  "kitchen  1.9 1.45 4.9   -135 -135"
)
mkdir -p public/pano .scratch
for style in french italian; do
  for spec in "${ROOMS[@]}"; do
    read -r room x y z french_yaw italian_yaw <<< "$spec"
    yaw=$french_yaw
    if [[ $style == italian ]]; then yaw=$italian_yaw; fi
    out=public/pano/$style-$room.jpg
    echo "START $style $room $(date +%H:%M:%S)"
    "$B" -b --python blender/render_pano.py -- ".scratch/export/$style.glb" ".scratch/export/$style.json" "$out" --cam "$x" "$y" "$z" --yaw "$yaw" "${COMMON[@]}" > ".scratch/pano_$style-$room.log" 2>&1
    grep -hE "RENDER done|Traceback" ".scratch/pano_$style-$room.log"
  done
done
echo ALL_DONE

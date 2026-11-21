#!/bin/bash
# Renders all episode-1 shots into build/frames (sequential, logs progress)
cd "$(dirname "$0")/../build"
for spec in "tavan 48" "oda 48" "yorgan 48" "ayakucu 60" "koridor 48"; do
  set -- $spec
  blender -b --python ../tools/scene_yurt.py -- $1 frames $2 > "log_$1.txt" 2>&1
  echo "$1 done $(date +%T)"
done

#!/bin/bash
cd "$(dirname "$0")/../build"
for spec in "sabah 36" "kampus 48"; do
  set -- $spec
  blender -b --python ../tools/scene_yurt.py -- $1 frames $2 > "log_$1.txt" 2>&1
  echo "$1 done $(date +%T)"
done

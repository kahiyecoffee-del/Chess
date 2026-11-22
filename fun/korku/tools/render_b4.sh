#!/bin/bash
cd "$(dirname "$0")/../build"
for s in kapi esik_kara pencere_yakin safak; do
  blender -b --python ../tools/scene_koy.py -- $s frames 48 > "log_$s.txt" 2>&1
  echo "$s done $(date +%T)"
done

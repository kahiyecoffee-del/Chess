#!/bin/bash
cd "$(dirname "$0")/../build"
for s in yol koy_dis ev_ic hatice esik tavan_arasi pencere; do
  blender -b --python ../tools/scene_koy.py -- $s frames 48 > "log_$s.txt" 2>&1
  echo "$s done $(date +%T)"
done

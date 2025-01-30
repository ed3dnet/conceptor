#!/bin/bash

# Kill processes matching specific patterns but preserve svc:up and esbuild
# shellcheck disable=SC2009
ps -eww -o pid,command | \
  grep -E '[p]npm|[d]rizzle-kit|[v]ite.js|entry-point.ts' | \
  grep -v 'esbuild' | \
  grep -v 'svc:up' | \
  awk '$1 != '$$' {print $1}' | \
  while read -r pid; do
    echo "Killing $pid"
    kill -9 "$pid"
  done
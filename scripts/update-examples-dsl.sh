#!/bin/bash
# Script to help update examples to use DSL-driven navigation

echo "This script generates DSL bindings for examples"
echo "Run this to see what bindings need to be added to each example"

for file in examples/{c4component,c4container,c4context,block,quadrant,requirement,timeline-experimental,gitgraph,journey,pie,er,state,class,sequence}/index.html; do
  if [ -f "$file" ]; then
    echo ""
    echo "=== $(basename $(dirname $file)) ==="
    grep -o 'data-goto="[^"]*"' "$file" | sed 's/data-goto="//; s/"//' | sort -u | while read step_id; do
      echo "          { event: \"click\", target: { selector: \"button[data-goto='$step_id']\" }, actions: [{ type: \"nav.goto\", payload: { id: \"$step_id\" } }] },"
    done
  fi
done

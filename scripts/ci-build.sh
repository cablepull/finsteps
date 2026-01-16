#!/usr/bin/env bash
set -euo pipefail

LOCK_FILES=(
  package-lock.json
  npm-shrinkwrap.json
  yarn.lock
  pnpm-lock.yaml
  bun.lockb
)

for lock_file in "${LOCK_FILES[@]}"; do
  if [[ -f "$lock_file" ]]; then
    rm -f "$lock_file"
  fi
done

npm install
npx playwright install --with-deps
npm run lint
npm run typecheck
npm test
npm run test:e2e

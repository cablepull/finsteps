#!/usr/bin/env bash
set -euo pipefail

# Script to sync examples/ to docs/examples/ for local GitHub Pages preview
# This mirrors what the GitHub Actions workflow does in deploy-pages.yml

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "🔄 Syncing examples to docs/examples/..."

# Create docs directories if they don't exist
mkdir -p docs/examples
mkdir -p docs/dist

# Remove old examples and dist
echo "  Cleaning old docs/examples/..."
rm -rf docs/examples/*

echo "  Cleaning old docs/dist/..."
rm -rf docs/dist/*

# Copy examples
echo "  Copying examples/* to docs/examples/..."
cp -R examples/* docs/examples/

# Copy dist
echo "  Copying dist/* to docs/dist/..."
cp -R dist/* docs/dist/

echo "✅ Sync complete!"
echo ""
echo "📋 Summary:"
echo "  - examples/ → docs/examples/"
echo "  - dist/ → docs/dist/"
echo ""
echo "🌐 You can now preview the docs site locally:"
echo "  npx serve -p 5173"
echo "  Open: http://localhost:5173/docs/"
echo ""

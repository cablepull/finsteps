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

# Verify the sync worked correctly
echo "🔍 Verifying path resolution..."
if [ -f "docs/dist/index.js" ]; then
  echo "  ✓ docs/dist/index.js exists"
else
  echo "  ✗ docs/dist/index.js missing!"
  exit 1
fi

if [ -d "docs/examples/mindmap" ]; then
  echo "  ✓ docs/examples/mindmap/ exists"
else
  echo "  ✗ docs/examples/mindmap/ missing!"
  exit 1
fi

# Verify relative paths work (examples import from ../../dist/)
cd docs/examples/mindmap
if [ -f "../../dist/index.js" ]; then
  echo "  ✓ Relative path ../../dist/index.js resolves correctly"
else
  echo "  ✗ Relative path resolution failed!"
  exit 1
fi
cd ../../..

echo ""
echo "📋 Summary:"
echo "  - Copied examples/ → docs/examples/"
echo "  - Copied dist/ → docs/dist/"
echo "  - Verified relative imports (../../dist/) work correctly"
echo ""
echo "🌐 You can now preview the docs site locally:"
echo "  npx serve -p 5173"
echo "  Open: http://localhost:5173/docs/"
echo ""
echo "📝 Note: Examples use relative paths (../../dist/) which work because:"
echo "  - docs/examples/mindmap/ imports ../../dist/ → resolves to docs/dist/ ✓"
echo "  - This matches the GitHub Pages structure where /docs is the root"
echo ""

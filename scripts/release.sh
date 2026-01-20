#!/usr/bin/env bash
set -euo pipefail

# Script to help create GitHub releases/tags for jsDelivr CDN distribution
# jsDelivr automatically serves files from GitHub releases/tags

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "🚀 Preparing release ${TAG}"

# Check if tag already exists
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "❌ Tag ${TAG} already exists"
  exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes. Commit them before creating a release."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build the library and bundles
echo "📦 Building library and bundles..."
npm run build:cdn

# Check that dist/ exists and has files
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo "❌ Build failed: dist/ directory is empty or missing"
  exit 1
fi

# Verify bundled files exist
if [ ! -f "dist/finsteps.esm.js" ] || [ ! -f "dist/finsteps.esm.min.js" ]; then
  echo "❌ Build failed: bundled files are missing"
  exit 1
fi

echo "✅ Build complete"

# Force-add only the bundled CDN files (they're normally gitignored)
echo "📝 Committing bundled files for CDN distribution..."
git add -f dist/finsteps.esm.js dist/finsteps.esm.min.js

# Commit the bundled files
git commit -m "chore: add CDN bundles for ${TAG}" || echo "⚠️  No changes to commit (bundles may already be committed)"

# Create git tag (which will include the committed bundles)
echo "🏷️  Creating git tag ${TAG}..."
git tag -a "${TAG}" -m "Release ${TAG}"

echo ""
echo "✅ Tag ${TAG} created locally with bundled files"
echo ""
echo "📋 Next steps:"
echo "   1. Push commits and tag to GitHub:"
echo "      git push origin main"
echo "      git push origin ${TAG}"
echo ""
echo "   2. Create a GitHub release:"
echo "      - Go to https://github.com/cablepull/finsteps/releases/new"
echo "      - Select tag: ${TAG}"
echo "      - Title: Release ${TAG}"
echo "      - Description: (optional release notes)"
echo "      - Click 'Publish release'"
echo ""
echo "   3. After release is published, jsDelivr will automatically serve:"
echo "      https://cdn.jsdelivr.net/gh/cablepull/finsteps@${TAG}/dist/finsteps.esm.min.js"
echo ""
echo "   Or use 'latest' for the latest release:"
echo "      https://cdn.jsdelivr.net/gh/cablepull/finsteps@latest/dist/finsteps.esm.min.js"
echo ""

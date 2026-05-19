#!/bin/bash
set -e

echo "🔄 Merging Testing → main"
echo "=========================="

git checkout main
git pull origin main
git merge Testing --no-edit
git push origin main

echo ""
echo "✅ Testing merged into main"
echo "🚀 GitHub Actions will deploy to production automatically"
echo "⚠️  This is a PRODUCTION deployment!"

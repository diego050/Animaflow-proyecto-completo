#!/bin/bash
set -e

echo "🔄 Merging Develop → Testing"
echo "============================"

git checkout Testing
git pull origin Testing
git merge Develop --no-edit
git push origin Testing

echo ""
echo "✅ Develop merged into Testing"
echo "🚀 GitHub Actions will deploy to testing environment automatically"

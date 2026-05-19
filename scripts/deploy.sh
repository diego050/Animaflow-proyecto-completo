#!/bin/bash
set -e

echo "🚀 AnimaFlow Deploy Script"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ backend/.env not found! Copy from .env.example and configure.${NC}"
    exit 1
fi

# Check required env vars
if grep -q "your-" backend/.env; then
    echo -e "${RED}❌ backend/.env contains placeholder values! Update them.${NC}"
    exit 1
fi

echo "📦 Building and starting services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services..."
sleep 10

echo "🔍 Health check..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy!${NC}"
else
    echo -e "${RED}❌ API health check failed!${NC}"
    docker-compose -f docker-compose.prod.yml logs api
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 AnimaFlow deployed successfully!${NC}"
echo "🌐 URL: http://localhost:8000"
echo "📊 Admin: http://localhost:8000/login"

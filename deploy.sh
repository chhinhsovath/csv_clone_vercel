#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
DEPLOY_DIR="/opt/deployments/vercel-clone"
REPO_URL="https://github.com/chhinhsovath/csv_clone_vercel.git"

echo -e "${BLUE}=========================================="
echo "🚀 Vercel Clone Deployment Script"
echo "==========================================${NC}"
echo ""

# Check if we're on the server or local
if [ ! -d "$DEPLOY_DIR" ]; then
  echo -e "${YELLOW}📁 Deployment directory not found. Creating...${NC}"
  mkdir -p "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR" || exit 1

# Initialize git repo if needed
if [ ! -d ".git" ]; then
  echo -e "${YELLOW}📦 Initializing git repository...${NC}"
  git init
  git remote add origin "$REPO_URL"
fi

echo ""
echo -e "${BLUE}=========================================="
echo "🔄 Pulling latest code from GitHub..."
echo "==========================================${NC}"
git fetch origin main
git reset --hard origin/main

echo ""
echo -e "${BLUE}=========================================="
echo "🐳 Building Docker images (this may take several minutes)..."
echo "==========================================${NC}"
if docker-compose build --no-cache; then
  echo -e "${GREEN}✅ Docker build completed successfully${NC}"
else
  echo -e "${RED}❌ Docker build failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}=========================================="
echo "🛑 Stopping existing services..."
echo "==========================================${NC}"
docker-compose down || true

echo ""
echo -e "${BLUE}=========================================="
echo "🚀 Starting all services..."
echo "==========================================${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}⏳ Waiting 30 seconds for services to fully start...${NC}"
sleep 30

echo ""
echo -e "${BLUE}=========================================="
echo "📊 Service Status:"
echo "==========================================${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}=========================================="
echo "🔍 Health Check Information"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}API Service (port 9000):${NC}"
curl -s http://localhost:9000/health || echo "Not yet responding"
echo ""

echo -e "${YELLOW}Functions Service (port 9001):${NC}"
curl -s http://localhost:9001/health || echo "Not yet responding"
echo ""

echo -e "${YELLOW}Dashboard (port 3000):${NC}"
curl -s http://localhost:3000/health || echo "Not yet responding"
echo ""

echo -e "${GREEN}=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Services are now running. Access points:${NC}"
echo "  🌐 Dashboard: http://localhost:3000"
echo "  📡 API: http://localhost:9000"
echo "  ⚙️  Functions: http://localhost:9001"
echo "  🔌 Reverse Proxy: http://localhost:80"
echo "  💾 MinIO: http://localhost:9000 (credentials: minioadmin/minioadmin)"
echo "  🗄️  PostgreSQL: localhost:5432"
echo "  🔄 Redis: localhost:6379"
echo ""
echo -e "${YELLOW}Docker Compose logs:${NC}"
echo "  docker-compose logs -f              # All services"
echo "  docker-compose logs -f api          # API only"
echo "  docker-compose logs -f dashboard    # Dashboard only"
echo ""

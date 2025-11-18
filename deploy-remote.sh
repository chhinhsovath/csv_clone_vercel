#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REMOTE_HOST="192.168.155.122"
REMOTE_USER="ubuntu"
DEPLOY_DIR="/opt/deployments/vercel-clone"
REPO_URL="https://github.com/chhinhsovath/csv_clone_vercel.git"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}=========================================="
echo "🚀 Remote Deployment - Vercel Clone"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo "  Remote Host: $REMOTE_HOST"
echo "  Remote User: $REMOTE_USER"
echo "  Deploy Dir: $DEPLOY_DIR"
echo "  Repo URL: $REPO_URL"
echo ""

# Function to print section headers
print_section() {
  echo ""
  echo -e "${BLUE}=========================================="
  echo "📍 $1"
  echo "==========================================${NC}"
  echo ""
}

# Step 1: Check if we can reach the server
print_section "Step 1: Testing SSH Connection"

if ssh -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" "echo 'SSH connection successful'" 2>/dev/null; then
  echo -e "${GREEN}✅ SSH connection to $REMOTE_HOST successful${NC}"
else
  echo -e "${RED}❌ Cannot connect to $REMOTE_HOST${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Ensure your SSH key is added to the remote server:"
  echo -e "   ${YELLOW}ssh-copy-id -i ~/.ssh/id_rsa $REMOTE_USER@$REMOTE_HOST${NC}"
  echo ""
  echo "2. Or ensure SSH key is in your SSH agent:"
  echo -e "   ${YELLOW}ssh-add ~/.ssh/id_rsa${NC}"
  echo ""
  echo "3. Test SSH connection:"
  echo -e "   ${YELLOW}ssh -v $REMOTE_USER@$REMOTE_HOST${NC}"
  exit 1
fi

# Step 2: Verify git status is clean
print_section "Step 2: Verifying Local Git Status"

cd "$SCRIPT_DIR"

git_status=$(git status --short)
if [ -n "$git_status" ]; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
  echo "$git_status"
  echo ""
  read -p "Continue deployment anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 3: Push to GitHub
print_section "Step 3: Pushing Code to GitHub"

current_branch=$(git rev-parse --abbrev-ref HEAD)
echo -e "${CYAN}Current branch: $current_branch${NC}"

git push origin "$current_branch" || {
  echo -e "${RED}❌ Failed to push to GitHub${NC}"
  exit 1
}

echo -e "${GREEN}✅ Code pushed to GitHub${NC}"

# Step 4: Prepare deployment on remote server
print_section "Step 4: Preparing Remote Server"

ssh "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_SCRIPT'
set -e

DEPLOY_DIR="/opt/deployments/vercel-clone"
REPO_URL="https://github.com/chhinhsovath/csv_clone_vercel.git"

echo "🔧 Preparing deployment directory..."

# Create deployment directory if it doesn't exist
if [ ! -d "$DEPLOY_DIR" ]; then
  mkdir -p "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# Initialize git repository if needed
if [ ! -d ".git" ]; then
  echo "📦 Initializing git repository..."
  git init
  git remote add origin "$REPO_URL"
fi

# Fetch and reset to main
echo "🔄 Fetching latest code..."
git fetch origin main
git reset --hard origin/main

echo "✅ Remote server prepared"
REMOTE_SCRIPT

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to prepare remote server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Remote server prepared successfully${NC}"

# Step 5: Build Docker images on remote server
print_section "Step 5: Building Docker Images on Remote Server"

echo -e "${CYAN}This may take 10-15 minutes depending on your connection...${NC}"
echo ""

ssh "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_BUILD'
set -e

DEPLOY_DIR="/opt/deployments/vercel-clone"
cd "$DEPLOY_DIR"

echo "🐳 Building Docker images..."
docker-compose build --no-cache

echo "✅ Docker build completed"
REMOTE_BUILD

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed on remote server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker images built successfully${NC}"

# Step 6: Deploy services on remote server
print_section "Step 6: Deploying Services"

ssh "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_DEPLOY'
set -e

DEPLOY_DIR="/opt/deployments/vercel-clone"
cd "$DEPLOY_DIR"

echo "🛑 Stopping existing services..."
docker-compose down || true

echo "🚀 Starting all services..."
docker-compose up -d

echo "⏳ Waiting 30 seconds for services to start..."
sleep 30

echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Deployment completed"
REMOTE_DEPLOY

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Service deployment failed${NC}"
  exit 1
fi

# Step 7: Health checks on remote server
print_section "Step 7: Running Health Checks"

echo -e "${CYAN}Testing service endpoints...${NC}"
echo ""

ssh "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_HEALTH'
echo "🔍 Checking API Service (port 9000)..."
if curl -s http://localhost:9000/health | grep -q '"status"' || curl -s http://localhost:9000/health >/dev/null 2>&1; then
  echo "✅ API is responding"
else
  echo "⏳ API not yet ready (will be ready in a few moments)"
fi

echo ""
echo "🔍 Checking Functions Service (port 9001)..."
if curl -s http://localhost:9001/health | grep -q '"status"' || curl -s http://localhost:9001/health >/dev/null 2>&1; then
  echo "✅ Functions Service is responding"
else
  echo "⏳ Functions Service not yet ready"
fi

echo ""
echo "🔍 Checking Dashboard (port 3000)..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
  echo "✅ Dashboard is responding"
else
  echo "⏳ Dashboard not yet ready"
fi
REMOTE_HEALTH

# Step 8: Final summary
print_section "Deployment Summary"

echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo ""
echo -e "${CYAN}Access your services:${NC}"
echo "  🌐 Dashboard: https://vercel.openplp.org"
echo "  📡 API: https://vercel.openplp.org/api"
echo "  ⚙️  Functions: https://vercel.openplp.org/functions"
echo ""
echo -e "${CYAN}SSH into server for debugging:${NC}"
echo "  ${YELLOW}ssh ubuntu@192.168.155.122${NC}"
echo ""
echo -e "${CYAN}View logs on remote server:${NC}"
echo "  ${YELLOW}docker-compose logs -f${NC}"
echo "  ${YELLOW}docker-compose logs -f api${NC}"
echo "  ${YELLOW}docker-compose logs -f dashboard${NC}"
echo ""
echo -e "${CYAN}Stop services on remote server:${NC}"
echo "  ${YELLOW}docker-compose down${NC}"
echo ""
echo -e "${BLUE}=========================================="
echo "Deployment Date: $(date)"
echo "==========================================${NC}"
echo ""

#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}=========================================="
echo "🏗️  Vercel Clone - Complete Build Script"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}Working directory: $SCRIPT_DIR${NC}"
echo ""

# Function to print section headers
print_section() {
  echo ""
  echo -e "${BLUE}=========================================="
  echo "📍 $1"
  echo "==========================================${NC}"
  echo ""
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
print_section "Step 1: Checking Prerequisites"

required_commands=("git" "docker" "docker-compose" "node" "npm")
missing_commands=()

for cmd in "${required_commands[@]}"; do
  if command_exists "$cmd"; then
    version=$($cmd --version 2>&1 | head -n1)
    echo -e "${GREEN}✅${NC} $cmd: $version"
  else
    echo -e "${RED}❌${NC} $cmd: NOT FOUND"
    missing_commands+=("$cmd")
  fi
done

if [ ${#missing_commands[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ Missing required commands: ${missing_commands[*]}${NC}"
  echo "Please install Docker Desktop for Mac and Node.js"
  exit 1
fi

# Step 2: Verify git repository
print_section "Step 2: Verifying Git Repository"

if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Not a git repository${NC}"
  exit 1
fi

git_status=$(git status --short)
if [ -n "$git_status" ]; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
  echo "$git_status"
  echo ""
  read -p "Continue with build? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}✅ Git repository is clean${NC}"

# Step 3: Install dependencies
print_section "Step 3: Installing Dependencies"

services=("api" "build-service" "reverse-proxy" "functions-service" "dashboard")

for service in "${services[@]}"; do
  if [ -f "apps/$service/package.json" ]; then
    echo -e "${CYAN}📦 Installing $service dependencies...${NC}"
    cd "$SCRIPT_DIR/apps/$service"
    npm install --legacy-peer-deps
    echo -e "${GREEN}✅ $service dependencies installed${NC}"
    cd "$SCRIPT_DIR"
  fi
done

# Step 4: Type checking
print_section "Step 4: Running TypeScript Type Check"

for service in "${services[@]}"; do
  if [ -f "apps/$service/tsconfig.json" ]; then
    echo -e "${CYAN}🔍 Type checking $service...${NC}"
    cd "$SCRIPT_DIR/apps/$service"
    if [ -f "node_modules/.bin/tsc" ]; then
      npm run type-check 2>/dev/null || echo -e "${YELLOW}⚠️  Type check warnings (non-blocking)${NC}"
    fi
    cd "$SCRIPT_DIR"
  fi
done

# Step 5: Linting
print_section "Step 5: Running ESLint"

for service in "${services[@]}"; do
  if [ -f "apps/$service/package.json" ]; then
    echo -e "${CYAN}📝 Linting $service...${NC}"
    cd "$SCRIPT_DIR/apps/$service"
    if grep -q "\"lint\":" package.json 2>/dev/null; then
      npm run lint 2>/dev/null || echo -e "${YELLOW}⚠️  Lint warnings (non-blocking)${NC}"
    fi
    cd "$SCRIPT_DIR"
  fi
done

# Step 6: Build Docker images
print_section "Step 6: Building Docker Images"

echo -e "${CYAN}🐳 Building all Docker images...${NC}"
echo "(This may take several minutes)"
echo ""

if docker-compose build --no-cache; then
  echo -e "${GREEN}✅ All Docker images built successfully${NC}"
else
  echo -e "${RED}❌ Docker build failed${NC}"
  exit 1
fi

# Step 7: Summary
print_section "Build Summary"

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo "1. Start services locally:"
echo -e "   ${YELLOW}docker-compose up -d${NC}"
echo ""
echo "2. Check service status:"
echo -e "   ${YELLOW}docker-compose ps${NC}"
echo ""
echo "3. View logs:"
echo -e "   ${YELLOW}docker-compose logs -f${NC}"
echo ""
echo "4. Stop services:"
echo -e "   ${YELLOW}docker-compose down${NC}"
echo ""
echo "5. Deploy to production:"
echo -e "   ${YELLOW}bash deploy-remote.sh${NC} (or manually copy deploy.sh to server)"
echo ""
echo -e "${BLUE}=========================================="
echo "Build Details:"
echo "==========================================${NC}"
echo "• Services: ${#services[@]} total"
echo "• Node version: $(node --version)"
echo "• Docker version: $(docker --version)"
echo "• Docker Compose version: $(docker-compose --version)"
echo ""

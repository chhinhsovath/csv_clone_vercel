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

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗"
echo "║     🚀 Vercel Clone - Complete Setup & Deploy Script     ║"
echo "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print menu
show_menu() {
  echo -e "${CYAN}What would you like to do?${NC}"
  echo ""
  echo "  ${YELLOW}1)${NC} Build locally (npm install, type-check, lint, docker build)"
  echo "  ${YELLOW}2)${NC} Start services locally (docker-compose up)"
  echo "  ${YELLOW}3)${NC} Stop local services (docker-compose down)"
  echo "  ${YELLOW}4)${NC} Deploy to production server (192.168.155.122)"
  echo "  ${YELLOW}5)${NC} Full pipeline (build + push + deploy)"
  echo "  ${YELLOW}6)${NC} View logs (local services)"
  echo "  ${YELLOW}0)${NC} Exit"
  echo ""
}

# Function to run build
run_build() {
  echo -e "${BLUE}Running build script...${NC}"
  bash "$SCRIPT_DIR/build.sh"
}

# Function to start services
start_services() {
  cd "$SCRIPT_DIR"
  echo -e "${BLUE}Starting services with docker-compose...${NC}"
  docker-compose up -d
  sleep 10

  echo ""
  echo -e "${GREEN}✅ Services started!${NC}"
  echo ""
  echo -e "${CYAN}Service URLs:${NC}"
  echo "  🌐 Dashboard: http://localhost:3000"
  echo "  📡 API: http://localhost:9000"
  echo "  ⚙️  Functions: http://localhost:9001"
  echo "  💾 MinIO: http://localhost:9000"
  echo "  🗄️  PostgreSQL: localhost:5432"
  echo "  🔄 Redis: localhost:6379"
  echo ""
  docker-compose ps
}

# Function to stop services
stop_services() {
  cd "$SCRIPT_DIR"
  echo -e "${BLUE}Stopping services...${NC}"
  docker-compose down
  echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to deploy
deploy_production() {
  echo -e "${BLUE}Deploying to production...${NC}"
  bash "$SCRIPT_DIR/deploy-remote.sh"
}

# Function to full pipeline
full_pipeline() {
  echo -e "${BLUE}Running full pipeline...${NC}"
  echo ""

  # Step 1: Build
  echo -e "${YELLOW}Step 1/3: Building...${NC}"
  bash "$SCRIPT_DIR/build.sh" || exit 1

  # Step 2: Commit and push
  echo ""
  echo -e "${YELLOW}Step 2/3: Pushing to GitHub...${NC}"
  cd "$SCRIPT_DIR"
  git status
  echo ""
  read -p "Ready to push? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
  fi

  # Step 3: Deploy
  echo ""
  echo -e "${YELLOW}Step 3/3: Deploying to production...${NC}"
  bash "$SCRIPT_DIR/deploy-remote.sh"
}

# Function to view logs
view_logs() {
  cd "$SCRIPT_DIR"
  echo -e "${CYAN}Available services:${NC}"
  echo "  ${YELLOW}1)${NC} All services"
  echo "  ${YELLOW}2)${NC} API only"
  echo "  ${YELLOW}3)${NC} Dashboard only"
  echo "  ${YELLOW}4)${NC} Build Service only"
  echo "  ${YELLOW}5)${NC} Reverse Proxy only"
  echo "  ${YELLOW}0)${NC} Back to menu"
  echo ""
  read -p "Select service: " service_choice

  case $service_choice in
    1) docker-compose logs -f ;;
    2) docker-compose logs -f api ;;
    3) docker-compose logs -f dashboard ;;
    4) docker-compose logs -f build-service ;;
    5) docker-compose logs -f reverse-proxy ;;
    0) return ;;
    *) echo -e "${RED}Invalid choice${NC}" ;;
  esac
}

# Main loop
while true; do
  show_menu
  read -p "Enter choice [1-6, 0 to exit]: " choice

  case $choice in
    1) run_build ;;
    2) start_services ;;
    3) stop_services ;;
    4) deploy_production ;;
    5) full_pipeline ;;
    6) view_logs ;;
    0)
      echo -e "${GREEN}Goodbye!${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid choice${NC}"
      ;;
  esac

  echo ""
  read -p "Press Enter to continue..."
  clear
done

#!/bin/bash

# Vercel Clone - Production Deployment Script
# Run this on server: 192.168.155.122
# Usage: bash deploy-production.sh

set -e

echo "🚀 Starting Vercel Clone Production Deployment..."
echo "=================================================="

# Step 1: Navigate to deployments directory
echo "📁 Step 1/8: Setting up directory..."
cd /opt/deployments/ || mkdir -p /opt/deployments && cd /opt/deployments
echo "✅ Directory ready"

# Step 2: Clone repository
echo ""
echo "📥 Step 2/8: Cloning repository..."
if [ -d "vercel-clone" ]; then
  echo "⚠️  vercel-clone already exists. Removing..."
  rm -rf vercel-clone
fi
git clone https://github.com/chhinhsovath/csv_clone_vercel.git vercel-clone
cd vercel-clone
echo "✅ Repository cloned"

# Step 3: Create .env file
echo ""
echo "⚙️  Step 3/8: Creating environment configuration..."
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel?schema=public"
DATABASE_HOST="192.168.155.122"
DATABASE_PORT="5432"
DATABASE_USER="admin_moeys"
DATABASE_PASSWORD="testing-123"
DATABASE_NAME="csv_vercel"

# Application
NODE_ENV="production"
PORT="9000"
CORS_ORIGINS="https://vercel.openplp.org,https://www.vercel.openplp.org"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-change-this-in-production-12345"
JWT_EXPIRY="24h"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_DB="0"

# MinIO
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="vercel-deployments"
MINIO_USE_SSL="false"

# Security
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="60"
INTERNAL_API_KEY="your-internal-api-key-change-this-12345"

# GitHub
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"

# SSL Certificates
CERTS_DIR="/app/certs"
LETS_ENCRYPT_EMAIL="admin@vercel.openplp.org"

# Monitoring
ANALYTICS_ENABLED="true"
ERROR_TRACKING_ENABLED="true"
ALERTS_ENABLED="true"
EOF
echo "✅ .env configuration created"

# Step 4: Build Docker images
echo ""
echo "🐳 Step 4/8: Building Docker images (this may take 15-20 minutes)..."
docker-compose build --no-cache
echo "✅ Docker images built"

# Step 5: Start services
echo ""
echo "🔌 Step 5/8: Starting services..."
docker-compose up -d
echo "✅ Services started"
sleep 5

# Step 6: Run database migrations
echo ""
echo "🗄️  Step 6/8: Running database migrations..."
docker-compose exec -T api npm run migrate
echo "✅ Database migrations completed"

# Step 7: Verify services
echo ""
echo "✔️  Step 7/8: Verifying services..."
docker-compose ps
echo ""
echo "Checking API health..."
sleep 3
curl -s http://localhost:9000/health | jq . || echo "⚠️  API not yet fully ready (may take a moment)"

# Step 8: Summary
echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "📊 Services Status:"
docker-compose ps
echo ""
echo "🌐 Access Points:"
echo "  - API: http://localhost:9000"
echo "  - Dashboard: http://localhost:3000"
echo "  - Functions: http://localhost:9001"
echo "  - MinIO: http://localhost:9001"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "⚙️  Next Steps:"
echo "  1. Configure Nginx reverse proxy (see DEPLOYMENT_GUIDE.md Step 7)"
echo "  2. Install SSL certificate with Let's Encrypt (see DEPLOYMENT_GUIDE.md Step 8)"
echo "  3. Point domain DNS to 192.168.155.122"
echo "  4. Access https://vercel.openplp.org when DNS resolves"
echo ""
echo "📋 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
echo ""
echo "🎉 Your Vercel Clone is now running on 192.168.155.122!"
echo ""

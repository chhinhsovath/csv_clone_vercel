# Quick Start: Deploy Vercel Clone to Production

**Server**: 192.168.155.122
**Domain**: vercel.openplp.org
**Status**: Ready for immediate deployment

---

## 🚀 Complete Deployment (Copy & Paste Commands)

### **Step 1: SSH to Server**
```bash
ssh admin_moeys@192.168.155.122
```

### **Step 2: Run Complete Deployment Script**

Copy and paste this entire block (runs everything at once):

```bash
#!/bin/bash
set -e

# Deploy Vercel Clone - Complete Automated Setup
echo "🚀 Starting complete Vercel Clone deployment..."

# ============================================
# PART 1: DEPLOY APPLICATION
# ============================================
cd /opt/deployments/ && \
if [ -d "vercel-clone" ]; then rm -rf vercel-clone; fi && \
git clone https://github.com/chhinhsovath/csv_clone_vercel.git vercel-clone && \
cd vercel-clone && \
cat > .env << 'ENVEOF'
DATABASE_URL="postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel?schema=public"
DATABASE_HOST="192.168.155.122"
DATABASE_PORT="5432"
DATABASE_USER="admin_moeys"
DATABASE_PASSWORD="testing-123"
DATABASE_NAME="csv_vercel"
NODE_ENV="production"
PORT="9000"
CORS_ORIGINS="https://vercel.openplp.org,https://www.vercel.openplp.org"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-change-this-in-production-12345"
JWT_EXPIRY="24h"
REDIS_URL="redis://localhost:6379"
REDIS_DB="0"
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="vercel-deployments"
MINIO_USE_SSL="false"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="60"
INTERNAL_API_KEY="your-internal-api-key-change-this-12345"
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
CERTS_DIR="/app/certs"
LETS_ENCRYPT_EMAIL="admin@vercel.openplp.org"
ANALYTICS_ENABLED="true"
ERROR_TRACKING_ENABLED="true"
ALERTS_ENABLED="true"
ENVEOF

echo "✅ Environment configured"
echo "🐳 Building Docker images (15-20 minutes)..."
docker-compose build --no-cache && \
echo "✅ Docker images built"

echo "🔌 Starting services..."
docker-compose up -d && \
sleep 5

echo "✅ Services started"
echo "🗄️  Running database migrations..."
docker-compose exec -T api npm run migrate && \
echo "✅ Database migrations completed"

echo ""
echo "✅ APPLICATION DEPLOYMENT COMPLETE!"
echo ""
docker-compose ps
echo ""

# ============================================
# PART 2: CONFIGURE NGINX & SSL
# ============================================
echo ""
echo "🔒 Configuring Nginx and SSL..."

# Create Nginx config
sudo bash -c 'cat > /etc/nginx/sites-available/vercel.openplp.org << '"'"'EOF'"'"'
upstream api {
  server localhost:9000;
}

upstream dashboard {
  server localhost:3000;
}

server {
  listen 80;
  listen [::]:80;
  server_name vercel.openplp.org www.vercel.openplp.org;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 301 https://$server_name$request_uri;
  }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name vercel.openplp.org www.vercel.openplp.org;

  ssl_certificate /etc/letsencrypt/live/vercel.openplp.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vercel.openplp.org/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  access_log /var/log/nginx/vercel.openplp.org.access.log;
  error_log /var/log/nginx/vercel.openplp.org.error.log;

  location /api/ {
    proxy_pass http://api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  location / {
    proxy_pass http://dashboard/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF'

# Enable site
sudo ln -sf /etc/nginx/sites-available/vercel.openplp.org /etc/nginx/sites-enabled/ && \
sudo nginx -t && \
echo "✅ Nginx configuration valid"

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
  sudo apt-get update -qq && \
  sudo apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
fi

# Create certbot webroot
sudo mkdir -p /var/www/certbot && \
sudo chown -R www-data:www-data /var/www/certbot

# Get SSL certificate
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d vercel.openplp.org \
  -d www.vercel.openplp.org \
  --email admin@vercel.openplp.org \
  --agree-tos \
  --non-interactive \
  --preferred-challenges=http

# Enable auto-renewal
sudo systemctl enable certbot.timer && \
sudo systemctl start certbot.timer

# Reload Nginx
sudo systemctl reload nginx && \
echo "✅ Nginx and SSL configured"

# ============================================
# PART 3: VERIFICATION
# ============================================
echo ""
echo "=============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "📊 Services running:"
docker-compose ps
echo ""
echo "🔒 SSL Certificate:"
sudo certbot certificates 2>/dev/null | grep -A 3 "vercel.openplp.org" || echo "Certificate details not yet available"
echo ""
echo "🌐 Access your deployment:"
echo "   https://vercel.openplp.org"
echo ""
echo "✨ Features available:"
echo "   ✅ Project management & deployment"
echo "   ✅ GitHub integration with CI/CD"
echo "   ✅ Custom domains & SSL/TLS"
echo "   ✅ Serverless functions"
echo "   ✅ Real-time analytics & monitoring"
echo "   ✅ Error tracking & alerts"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Check services: docker-compose ps"
echo "   Stop services: cd /opt/deployments/vercel-clone && docker-compose down"
echo "   View Nginx logs: tail -f /var/log/nginx/vercel.openplp.org.access.log"
echo ""
echo "🎉 Your Vercel Clone is LIVE!"
echo "=============================================="
```

---

## 📋 Or Run Step-by-Step (If You Prefer)

If you want to run the deployment step by step instead:

### **Step 1: Copy deployment scripts to server**
```bash
scp /Users/chhinhsovath/Documents/GitHub/clone_vercel/deploy-production.sh admin_moeys@192.168.155.122:/tmp/
scp /Users/chhinhsovath/Documents/GitHub/clone_vercel/setup-nginx-ssl.sh admin_moeys@192.168.155.122:/tmp/
```

### **Step 2: SSH and run deployment**
```bash
ssh admin_moeys@192.168.155.122
bash /tmp/deploy-production.sh
```

### **Step 3: SSH and run Nginx/SSL setup**
```bash
ssh admin_moeys@192.168.155.122
bash /tmp/setup-nginx-ssl.sh
```

---

## ⏱️ Expected Timeline

| Phase | Time | Status |
|-------|------|--------|
| Clone & setup | 2-3 min | Fast |
| Docker build | 15-20 min | ⏳ Longest |
| Start services | 1-2 min | Fast |
| Database migrations | 1-2 min | Fast |
| Nginx config | 1 min | Fast |
| SSL certificate | 2-3 min | Fast |
| **TOTAL** | **~25-30 min** | ✅ |

---

## ✅ Verification Checklist

After deployment, verify everything works:

```bash
# 1. Check all services are running
docker-compose ps

# 2. Test API health
curl http://localhost:9000/health

# 3. Check SSL certificate
sudo certbot certificates

# 4. Test HTTPS access (from your local machine)
curl -I https://vercel.openplp.org

# 5. View application logs
docker-compose logs -f api
```

---

## 🎯 What You Now Have

✅ **Complete Vercel clone running on vercel.openplp.org**
✅ **HTTPS/SSL enabled with Let's Encrypt**
✅ **Automatic certificate renewal configured**
✅ **Nginx reverse proxy with security headers**
✅ **PostgreSQL database connected**
✅ **Redis cache running**
✅ **API server on port 9000**
✅ **Dashboard on port 3000**
✅ **All 10 phases deployed**

---

## 🚨 If Something Goes Wrong

```bash
# View error logs
docker-compose logs api

# Check Nginx errors
sudo tail -f /var/log/nginx/vercel.openplp.org.error.log

# Restart services
docker-compose restart

# Check port availability
sudo lsof -i :9000
sudo lsof -i :3000
```

---

## 🎉 Success!

Once you see:
```
✅ DEPLOYMENT COMPLETE!
https://vercel.openplp.org
```

**Your Vercel Clone is LIVE and ready to use!** 🚀


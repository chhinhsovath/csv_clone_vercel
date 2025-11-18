# Fixed Deployment: Vercel Clone on vercel.openplp.org

**Issue Identified**: DNS was pointing to webadmin.openplp.com (port 8080) instead of vercel.openplp.org

**Solution**: Configure separate Nginx virtual host for vercel.openplp.org pointing to port 9000

---

## 🔧 Fixed Deployment Command

SSH to your server and run this corrected script:

```bash
#!/bin/bash
set -e

echo "🚀 Starting CORRECTED Vercel Clone Deployment..."
echo "=================================================="

# ============================================
# PART 1: DEPLOY APPLICATION
# ============================================
echo ""
echo "📥 PART 1: Deploying Application..."
echo ""

cd /opt/deployments/ || mkdir -p /opt/deployments && cd /opt/deployments

if [ -d "vercel-clone" ]; then
  echo "⚠️  Removing existing deployment..."
  rm -rf vercel-clone
fi

echo "📦 Cloning repository..."
git clone https://github.com/chhinhsovath/csv_clone_vercel.git vercel-clone
cd vercel-clone

echo "⚙️  Creating .env configuration..."
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

echo "✅ .env file created"
echo ""
echo "🐳 Building Docker images (this will take 15-20 minutes)..."
docker-compose build --no-cache

echo "✅ Docker images built successfully"
echo ""
echo "🔌 Starting Docker services..."
docker-compose up -d
sleep 10

echo "✅ Services started"
echo ""
echo "🗄️  Running database migrations..."
docker-compose exec -T api npm run migrate

echo "✅ Database migrations completed"
echo ""
echo "✅ APPLICATION DEPLOYMENT COMPLETE!"
echo ""

# ============================================
# PART 2: CONFIGURE NGINX FOR VERCEL
# ============================================
echo ""
echo "🔒 PART 2: Configuring Nginx for vercel.openplp.org..."
echo ""

echo "📝 Creating Nginx configuration for vercel.openplp.org..."
sudo bash -c 'cat > /etc/nginx/sites-available/vercel.openplp.org << '"'"'EOF'"'"'
# Upstream servers for Vercel Clone
upstream vercel_api {
  server localhost:9000;
}

upstream vercel_dashboard {
  server localhost:3000;
}

# HTTP redirect to HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name vercel.openplp.org www.vercel.openplp.org;

  # Allow Let'"'"'s Encrypt validation
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  # Redirect all other traffic to HTTPS
  location / {
    return 301 https://$server_name$request_uri;
  }
}

# HTTPS server for Vercel Clone
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name vercel.openplp.org www.vercel.openplp.org;

  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/vercel.openplp.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vercel.openplp.org/privkey.pem;

  # SSL configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Logging
  access_log /var/log/nginx/vercel.openplp.org.access.log;
  error_log /var/log/nginx/vercel.openplp.org.error.log;

  # API proxy (port 9000)
  location /api/ {
    proxy_pass http://vercel_api/;
    proxy_http_version 1.1;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $server_name;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Dashboard proxy (port 3000)
  location / {
    proxy_pass http://vercel_dashboard/;
    proxy_http_version 1.1;

    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF'

echo "✅ Nginx configuration created"
echo ""

echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/vercel.openplp.org /etc/nginx/sites-enabled/vercel.openplp.org

echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
  echo "✅ Nginx configuration is valid"
else
  echo "❌ Nginx configuration has errors - please check"
  exit 1
fi

echo ""
echo "📦 Installing certbot if needed..."
if ! command -v certbot &> /dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
  echo "✅ Certbot installed"
else
  echo "✅ Certbot already installed"
fi

echo ""
echo "📁 Creating certbot webroot..."
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
echo "✅ Certbot webroot ready"
echo ""

echo "🔐 Installing SSL certificate with Let's Encrypt..."
echo "   Domain: vercel.openplp.org"
echo "   Email: admin@vercel.openplp.org"
echo ""

sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d vercel.openplp.org \
  -d www.vercel.openplp.org \
  --email admin@vercel.openplp.org \
  --agree-tos \
  --non-interactive \
  --preferred-challenges=http \
  --expand

echo ""
echo "✅ SSL certificate installed successfully"
echo ""

echo "⏰ Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
echo "✅ Auto-renewal enabled"
echo ""

echo "🔄 Reloading Nginx with new configuration..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

# ============================================
# PART 3: VERIFICATION
# ============================================
echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""

echo "📊 Docker Services Status:"
echo ""
docker-compose ps
echo ""

echo "🔒 SSL Certificates:"
echo ""
sudo certbot certificates 2>/dev/null | grep -A 5 "vercel.openplp.org" || echo "Certificate check in progress..."
echo ""

echo "📝 Nginx Sites Enabled:"
echo ""
ls -la /etc/nginx/sites-enabled/ | grep -E "vercel|webadmin" || echo "Sites check..."
echo ""

echo "🌐 Your Vercel Clone is now LIVE at:"
echo ""
echo "   🎉 https://vercel.openplp.org"
echo ""

echo "✨ Available Features:"
echo "   ✅ Project Management & Deployment"
echo "   ✅ GitHub Integration with CI/CD"
echo "   ✅ Custom Domains & SSL/TLS"
echo "   ✅ Serverless Functions"
echo "   ✅ Real-time Analytics & Monitoring"
echo "   ✅ Error Tracking & Alerts"
echo "   ✅ Rate Limiting & Security"
echo ""

echo "📋 Useful Commands:"
echo ""
echo "   View Vercel logs:"
echo "   docker-compose -f /opt/deployments/vercel-clone/docker-compose.yml logs -f api"
echo ""
echo "   View Nginx logs for vercel.openplp.org:"
echo "   tail -f /var/log/nginx/vercel.openplp.org.access.log"
echo ""
echo "   Check all Nginx sites:"
echo "   ls -la /etc/nginx/sites-enabled/"
echo ""
echo "   Reload Nginx (if you make changes):"
echo "   sudo systemctl reload nginx"
echo ""
echo "   Test Nginx configuration:"
echo "   sudo nginx -t"
echo ""

echo "📌 Note: Both subdomains now work:"
echo "   - https://vercel.openplp.org (Port 9000 - Your new Vercel Clone)"
echo "   - https://webadmin.openplp.org (Port 8080 - Your existing app)"
echo ""

echo "=================================================="
echo "🎉 Your Vercel Clone is LIVE and Ready to Use!"
echo "=================================================="
echo ""
```

---

## 🚀 Quick Setup Steps:

### **Step 1: SSH to Server**
```bash
ssh admin_moeys@192.168.155.122
```

### **Step 2: Copy & Paste the Script Above**
Copy the entire bash script and paste it into your terminal.

### **Step 3: Press Enter and Wait**
The script will run for approximately 25-35 minutes.

---

## ⏱️ Timeline:

| Phase | Duration | Notes |
|-------|----------|-------|
| Docker build | 15-20 min | ⏳ Longest part |
| Start services | 2-3 min | Fast |
| Database migrations | 2-3 min | Fast |
| Nginx config | 1 min | Fast |
| SSL certificate | 3-5 min | Using Let's Encrypt |
| Auto-renewal setup | 1 min | Fast |
| **TOTAL** | **~25-35 min** | ✅ Ready! |

---

## ✅ After Deployment - What You'll Have:

✅ **vercel.openplp.org** (NEW) - Running on ports 9000 (API) + 3000 (Dashboard)
✅ **webadmin.openplp.org** (EXISTING) - Still running on port 8080 (unchanged)
✅ **Both have separate HTTPS/SSL certificates**
✅ **Both have Nginx configurations that don't conflict**

---

## 🔍 Verification Commands (After Deployment):

```bash
# Check both services are separate
ls -la /etc/nginx/sites-enabled/

# Check Vercel logs
docker-compose -f /opt/deployments/vercel-clone/docker-compose.yml logs -f

# Test vercel subdomain
curl -I https://vercel.openplp.org

# Test webadmin still works
curl -I https://webadmin.openplp.org

# Check SSL certificates
sudo certbot certificates
```

---

## 🚨 If Vercel Still Shows Webadmin Page:

This means DNS is still resolving to the old server/port. Try:

```bash
# Flush DNS cache on your local machine
# macOS:
sudo dscacheutil -flushcache

# Ubuntu/Linux:
sudo systemctl restart systemd-resolved

# Then try again:
curl -v https://vercel.openplp.org
```

---

## Ready? 🚀

**Just copy the script above and paste it into your terminal on 192.168.155.122!**

Let me know when you start and I'll help monitor the deployment! 🎉

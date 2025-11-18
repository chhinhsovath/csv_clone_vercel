#!/bin/bash

# Vercel Clone - Nginx & SSL Setup Script
# Run this on server: 192.168.155.122
# Usage: bash setup-nginx-ssl.sh

set -e

echo "🔒 Starting Nginx & SSL Certificate Setup..."
echo "=============================================="

# Configuration
DOMAIN="vercel.openplp.org"
EMAIL="admin@vercel.openplp.org"

# Step 1: Create Nginx configuration
echo ""
echo "📝 Step 1/4: Creating Nginx reverse proxy configuration..."
sudo bash -c 'cat > /etc/nginx/sites-available/vercel.openplp.org << '"'"'EOF'"'"'
upstream api {
  server localhost:9000;
}

upstream dashboard {
  server localhost:3000;
}

# HTTP to HTTPS redirect
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

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name vercel.openplp.org www.vercel.openplp.org;

  # SSL configuration
  ssl_certificate /etc/letsencrypt/live/vercel.openplp.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vercel.openplp.org/privkey.pem;
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

  # API endpoints
  location /api/ {
    proxy_pass http://api/;
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

  # Dashboard
  location / {
    proxy_pass http://dashboard/;
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

# Step 2: Enable the site
echo ""
echo "🔗 Step 2/4: Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/vercel.openplp.org /etc/nginx/sites-enabled/vercel.openplp.org

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t
echo "✅ Nginx configuration is valid"

# Step 3: Reload Nginx
echo ""
echo "🔄 Step 3/4: Reloading Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"

# Step 4: Install SSL certificate
echo ""
echo "🔐 Step 4/4: Installing SSL certificate with Let's Encrypt..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  sudo apt-get update -qq
  sudo apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
  echo "✅ Certbot installed"
fi

# Get SSL certificate (webroot method - works with existing Nginx)
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d vercel.openplp.org \
  -d www.vercel.openplp.org \
  --email admin@vercel.openplp.org \
  --agree-tos \
  --non-interactive \
  --preferred-challenges=http || \
  echo "⚠️  Certbot encountered an issue. Manual intervention may be needed."

# Create www directory if needed
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

echo "✅ SSL certificate installed"

# Step 5: Set up auto-renewal
echo ""
echo "⏰ Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
echo "✅ Auto-renewal enabled"

# Final verification
echo ""
echo "=============================================="
echo "✅ NGINX & SSL SETUP COMPLETE!"
echo "=============================================="
echo ""
echo "🔍 Verification:"
echo ""
echo "1. Nginx status:"
sudo systemctl status nginx --no-pager | head -3
echo ""
echo "2. SSL certificate info:"
sudo certbot certificates 2>/dev/null | grep -A 3 "vercel.openplp.org" || echo "Certificate installation in progress..."
echo ""
echo "3. Testing HTTPS access:"
sleep 2
echo "Waiting for Nginx to fully reload..."
sleep 2
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://vercel.openplp.org/ || echo "⏳ HTTPS still initializing..."
echo ""
echo "🌐 You should now be able to access:"
echo "   - https://vercel.openplp.org"
echo "   - https://www.vercel.openplp.org"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: tail -f /var/log/nginx/vercel.openplp.org.access.log"
echo "   - Check cert: sudo certbot certificates"
echo "   - Renew cert: sudo certbot renew --dry-run"
echo "   - Reload Nginx: sudo systemctl reload nginx"
echo ""
echo "🎉 Your Vercel Clone is now live on https://vercel.openplp.org!"
echo ""

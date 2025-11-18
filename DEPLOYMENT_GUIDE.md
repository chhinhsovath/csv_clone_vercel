# Vercel Clone - Production Deployment Guide

**Status**: Ready for deployment
**Date**: 2024-11-18
**Platform**: vercel.openplp.org

---

## 🚀 Quick Start Deployment

### Prerequisites
```bash
✅ Server: 192.168.155.122
✅ PostgreSQL: csv_vercel database ready
✅ Docker & Docker Compose installed
✅ Git repository: https://github.com/chhinhsovath/csv_clone_vercel.git
```

---

## 📋 Step 1: Clone Repository

```bash
# SSH to production server
ssh admin_moeys@192.168.155.122

# Navigate to deployment directory
cd /opt/deployments/

# Clone the repository
git clone https://github.com/chhinhsovath/csv_clone_vercel.git vercel-clone
cd vercel-clone
```

---

## 🔧 Step 2: Configure Environment Variables

Create `.env` file in the root directory:

```bash
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://admin_moeys:testing-123@localhost:5432/csv_vercel?schema=public"
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
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-change-this"
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
INTERNAL_API_KEY="your-internal-api-key-change-this"

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
```

---

## 🏗️ Step 3: Build Docker Images

```bash
# Build all services
docker-compose build

# Or build specific services
docker-compose build api dashboard build-service reverse-proxy functions-service
```

---

## 🗄️ Step 4: Database Setup

```bash
# Run database migrations
docker-compose exec api npm run migrate

# Or if using Prisma directly
docker-compose exec api npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec api npx prisma db seed
```

---

## 🚀 Step 5: Start Services

```bash
# Start all services in background
docker-compose up -d

# Or start with logs visible
docker-compose up

# Monitor logs
docker-compose logs -f
```

**Services will start on:**
- API: http://localhost:9000
- Dashboard: http://localhost:3000
- Functions: http://localhost:9001
- Reverse Proxy: http://localhost:80/443
- MinIO: http://localhost:9001
- Redis: localhost:6379
- PostgreSQL: localhost:5432

---

## ✅ Step 6: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Test API health
curl http://localhost:9000/health

# Check database connection
docker-compose exec api npm run db:check

# View logs for errors
docker-compose logs --tail=100
```

**Expected Output:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-18T...",
  "services": {
    "database": "connected",
    "redis": "connected",
    "minio": "connected"
  }
}
```

---

## 🌐 Step 7: Configure Nginx/Reverse Proxy

```bash
# Create nginx configuration for domain
sudo cat > /etc/nginx/sites-available/vercel.openplp.org << 'EOF'
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

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name vercel.openplp.org www.vercel.openplp.org;

  # SSL Configuration
  ssl_certificate /etc/letsencrypt/live/vercel.openplp.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vercel.openplp.org/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # API endpoints
  location /api {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Dashboard
  location / {
    proxy_pass http://dashboard;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/vercel.openplp.org \
           /etc/nginx/sites-enabled/vercel.openplp.org

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔐 Step 8: SSL Certificates

```bash
# Install Let's Encrypt certificate
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d vercel.openplp.org \
  -d www.vercel.openplp.org \
  --email admin@vercel.openplp.org

# Or use standalone
sudo certbot certonly --standalone \
  -d vercel.openplp.org \
  -d www.vercel.openplp.org \
  --email admin@vercel.openplp.org

# Auto-renewal setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🆘 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs api

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection error
```bash
# Verify database is running
psql -h 192.168.155.122 -U admin_moeys -d csv_vercel -c "SELECT 1"

# Check connection string
docker-compose exec api echo $DATABASE_URL
```

### Port conflicts
```bash
# Find process using port
lsof -i :9000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Disk space issues
```bash
# Check disk usage
du -sh /var/lib/docker/
df -h /

# Clean up
docker system prune -a
```

---

## 📊 Post-Deployment Checks

```bash
# 1. Verify all services running
docker-compose ps

# 2. Check database
curl http://localhost:9000/health

# 3. Test API endpoints
curl -X GET http://localhost:9000/api/health

# 4. Check logs for errors
docker-compose logs --tail=50 api dashboard

# 5. Verify SSL certificate
curl -I https://vercel.openplp.org

# 6. Test dashboard access
open https://vercel.openplp.org
```

---

## 🔄 Continuous Deployment

### Enable Auto-Deployment
```bash
# Create webhook receiver
cat > /opt/deployments/update.sh << 'EOF'
#!/bin/bash
cd /opt/deployments/vercel-clone
git fetch origin
git reset --hard origin/main
docker-compose build
docker-compose up -d
EOF

chmod +x /opt/deployments/update.sh

# Add to GitHub webhook:
# URL: http://192.168.155.122:9000/api/webhooks/github
# Events: Push events
```

---

## 📝 Backup & Recovery

### Automatic Backups
```bash
# Create backup script
cat > /opt/backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h 192.168.155.122 -U admin_moeys csv_vercel | gzip > $BACKUP_DIR/db.sql.gz

# Application files
tar -czf $BACKUP_DIR/app.tar.gz /opt/deployments/vercel-clone

# Keep last 30 days
find /opt/backups -type d -mtime +30 -exec rm -rf {} \;
EOF

chmod +x /opt/backups/backup.sh

# Schedule daily at 2 AM
crontab -e
# 0 2 * * * /opt/backups/backup.sh
```

---

## 🎯 Monitoring Setup

### Health Checks
```bash
# Monitor services
watch -n 5 'docker-compose ps'

# Check logs
docker-compose logs -f --tail=20

# Monitor resource usage
docker stats
```

### Alerts
Set up alerts for:
- API down (HTTP 503)
- High error rate (> 5% 4xx/5xx)
- Slow response time (> 1000ms)
- Database connection errors
- Disk space low (< 10%)

---

## 🚀 Production Checklist

- [ ] Repository cloned
- [ ] Environment variables set
- [ ] Database configured
- [ ] Docker images built
- [ ] Services started successfully
- [ ] API health check passing
- [ ] Database migrations applied
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] Domain pointing to server
- [ ] GitHub webhooks configured
- [ ] Backups scheduled
- [ ] Monitoring enabled
- [ ] Logs configured
- [ ] Security hardened

---

## 📞 Emergency Procedures

### Rollback
```bash
# Revert to previous version
git log --oneline
git revert <commit-hash>
git push origin main
docker-compose build
docker-compose up -d
```

### Database Recovery
```bash
# Restore from backup
psql -h 192.168.155.122 -U admin_moeys csv_vercel < backup.sql
```

### Service Restart
```bash
# Restart specific service
docker-compose restart api

# Restart all services
docker-compose restart

# Stop all services
docker-compose down
```

---

## 📊 Performance Optimization

```bash
# Enable compression
docker-compose exec api npm run build

# Optimize database
docker-compose exec -T api psql -U admin_moeys -d csv_vercel \
  -c "VACUUM ANALYZE;"

# Cache warming (after deployment)
curl -X GET https://vercel.openplp.org/api/health
curl -X GET https://vercel.openplp.org/
```

---

## ✅ Deployment Complete

Your Vercel Clone is now running on **vercel.openplp.org**!

**Next Steps:**
1. Create your first project
2. Connect GitHub repository
3. Configure environment variables
4. Deploy your application
5. Monitor deployment status
6. View analytics dashboard

---

**Deployment Date**: 2024-11-18
**Version**: 1.0.0
**Status**: Production Ready ✅

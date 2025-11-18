# 🚀 Vercel Clone - Deployment Guide

Complete guide to build and deploy the Vercel Clone application from your MacBook.

## Quick Start

### Interactive Menu (Recommended)
```bash
cd /Users/chhinhsovath/Documents/GitHub/clone_vercel
bash start.sh
```

This opens an interactive menu where you can:
- **Option 1**: Build locally (npm install, type-check, lint, docker build)
- **Option 2**: Start local services (docker-compose up)
- **Option 3**: Stop local services
- **Option 4**: Deploy to production (192.168.155.122)
- **Option 5**: Full pipeline (build + push + deploy)
- **Option 6**: View logs

---

## Scripts Overview

### 1. build.sh - Local Build
**Purpose**: Build everything locally before deployment

**What it does**:
- ✅ Checks prerequisites (git, docker, node, npm)
- ✅ Installs npm dependencies for all services
- ✅ Runs TypeScript type checking
- ✅ Runs ESLint
- ✅ Builds all Docker images with `--no-cache`

**Usage**:
```bash
bash build.sh
```

**Time**: ~5-10 minutes (first run), ~2-3 minutes (cached)

---

### 2. deploy-remote.sh - Deploy from MacBook
**Purpose**: Deploy everything from your MacBook to production server

**What it does**:
- ✅ Tests SSH connection to 192.168.155.122
- ✅ Verifies local git is clean
- ✅ Pushes code to GitHub
- ✅ Prepares remote deployment directory
- ✅ Builds Docker images on remote server
- ✅ Deploys and starts all services
- ✅ Runs health checks

**Prerequisites**:
- SSH key access to ubuntu@192.168.155.122
- Set up SSH key:
```bash
ssh-copy-id -i ~/.ssh/id_rsa ubuntu@192.168.155.122
```

**Usage**:
```bash
bash deploy-remote.sh
```

**Time**: ~15-30 minutes (includes docker build on remote)

---

### 3. start.sh - Interactive Menu
**Purpose**: User-friendly menu to manage all operations

**Options**:
```
1) Build locally
2) Start services locally
3) Stop local services
4) Deploy to production
5) Full pipeline (build + push + deploy)
6) View logs
0) Exit
```

**Usage**:
```bash
bash start.sh
```

---

## Manual Workflow

### Option A: Full Local Testing First

1. **Build locally**:
   ```bash
   bash build.sh
   ```

2. **Start local services**:
   ```bash
   docker-compose up -d
   ```

3. **Check service status**:
   ```bash
   docker-compose ps
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f api
   docker-compose logs -f dashboard
   ```

5. **Stop local services**:
   ```bash
   docker-compose down
   ```

6. **Deploy to production**:
   ```bash
   bash deploy-remote.sh
   ```

---

### Option B: Quick Deploy (Skip Local Testing)

1. **Build and deploy in one command**:
   ```bash
   bash build.sh && bash deploy-remote.sh
   ```

Or use the interactive menu:
```bash
bash start.sh
# Select option 5: Full pipeline
```

---

## Service Access

### Local Services (After `docker-compose up -d`)
- 🌐 **Dashboard**: http://localhost:3000
- 📡 **API**: http://localhost:9000
- ⚙️ **Functions Service**: http://localhost:9001
- 💾 **MinIO**: http://localhost:9000
- 🗄️ **PostgreSQL**: localhost:5432
- 🔄 **Redis**: localhost:6379

### Production Services (After deploy)
- 🌐 **Dashboard**: https://vercel.openplp.org
- 📡 **API**: https://vercel.openplp.org/api
- ⚙️ **Functions**: https://vercel.openplp.org/functions

---

## Troubleshooting

### SSH Connection Failed
**Problem**: `Permission denied (publickey,password)`

**Solution**:
```bash
ssh-copy-id -i ~/.ssh/id_rsa ubuntu@192.168.155.122
```

### Docker Build Failed
**Problem**: Docker build fails

**Solution**:
```bash
docker system prune -a
docker restart
```

### Services Not Starting
**Problem**: Containers exit immediately

**Solution**:
```bash
docker-compose logs api
docker-compose logs dashboard
docker-compose restart
```

---

## Common Commands Reference

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f dashboard

# Check service health
curl http://localhost:9000/health
curl http://localhost:9001/health

# SSH to server
ssh ubuntu@192.168.155.122

# View remote logs
ssh ubuntu@192.168.155.122 "cd /opt/deployments/vercel-clone && docker-compose logs -f"
```

---

## Next Steps

1. **Run the interactive menu**:
   ```bash
   bash start.sh
   ```

2. **Or deploy directly**:
   ```bash
   bash deploy-remote.sh
   ```

Good luck! 🚀

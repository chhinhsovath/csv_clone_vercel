# Getting Started - Vercel Clone Development

This guide will help you set up the Vercel Clone platform on your local machine for development.

## Prerequisites

Before you begin, make sure you have:

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Docker**: v20.10 or higher
- **Docker Compose**: v1.29 or higher
- **Git**: v2.30 or higher

Check your versions:

```bash
node --version          # v18.0.0 or higher
npm --version           # v9.0.0 or higher
docker --version        # v20.10.0 or higher
docker-compose --version # v1.29.0 or higher
git --version           # v2.30.0 or higher
```

## Project Structure Overview

The project is organized as a monorepo with the following structure:

```
vercel-clone/
├── apps/
│   ├── api/              # Fastify API server (port 9000)
│   ├── dashboard/        # Next.js frontend (port 3000)
│   ├── build-service/    # Build and deployment service
│   └── reverse-proxy/    # Domain routing and SSL
├── prisma/               # Database schema and migrations
├── docker-compose.yml    # Docker services orchestration
├── package.json          # Root workspace config
└── README.md            # Main documentation
```

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/vercel-clone.git
cd vercel-clone

# Install root dependencies
npm install

# This installs dependencies for all workspaces:
# - apps/api
# - apps/dashboard
# - apps/build-service
# - apps/reverse-proxy
```

## Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Important environment variables to set:**

```bash
# Database
DB_USER=vercel_user
DB_PASSWORD=your_secure_password  # Change this!
DB_NAME=vercel_clone

# JWT
JWT_SECRET=your_jwt_secret_key    # Change this!

# GitHub OAuth (optional for now)
# Get credentials from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

## Step 3: Start Docker Services

```bash
# Start all services (PostgreSQL, Redis, MinIO)
npm run docker:up

# Verify services are running
docker-compose ps

# You should see:
# - postgres (healthy)
# - redis (healthy)
# - minio (healthy)
```

Expected output:
```
CONTAINER ID   IMAGE                 STATUS
abc123...      postgres:15-alpine    healthy
def456...      redis:7-alpine        healthy
ghi789...      minio/minio:latest    healthy
```

## Step 4: Set Up Database

```bash
# Initialize Prisma client
npm run db:generate

# Create and apply database schema
npm run db:push

# Verify database connection
docker-compose logs postgres  # Should show "database system is ready to accept connections"
```

## Step 5: Start Development Servers

### Option A: Run All Services Together

```bash
# Terminal 1: Start all services
npm run dev

# This will start:
# - API Server (http://localhost:9000)
# - Dashboard (http://localhost:3000)
# - Build Service (listening to Redis queue)
# - Reverse Proxy (http://localhost:80)
```

### Option B: Run Services Separately

```bash
# Terminal 1: Start API Server
cd apps/api
npm run dev
# API running on http://localhost:9000

# Terminal 2: Start Dashboard
cd apps/dashboard
npm run dev
# Dashboard running on http://localhost:3000

# Terminal 3: Start Build Service
cd apps/build-service
npm run dev

# Terminal 4: Start Reverse Proxy
cd apps/reverse-proxy
npm run dev
```

## Step 6: Verify Everything Works

### 1. Check API Health

```bash
curl http://localhost:9000/health
# Expected response: { "status": "ok", "timestamp": "2024-..." }
```

### 2. Create a Test User

```bash
curl -X POST http://localhost:9000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Expected response:
# { "message": "User registered successfully", "user": {...}, "token": "eyJ..." }
```

### 3. Access Dashboard

Open http://localhost:3000 in your browser

You should see the login page.

### 4. Check MinIO Console

Open http://localhost:9001 in your browser

- **Username**: minioadmin
- **Password**: minioadmin

## Common Development Tasks

### View Logs

```bash
# All services
npm run docker:logs

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
```

### Database Operations

```bash
# Create a new migration
npm run db:migrate

# Push schema changes
npm run db:push

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Run Tests

```bash
# API tests
cd apps/api
npm run test

# All tests
npm run test  # from root
```

### Code Quality

```bash
# Run linting
npm run lint

# Format code
npm run format

# Type checking
cd apps/api
npm run type-check
```

## Troubleshooting

### PostgreSQL Connection Refused

```bash
# Check if postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres

# Recreate postgres container
docker-compose down
docker volume rm vercel_clone_postgres_data
docker-compose up -d postgres
```

### Port Already in Use

```bash
# Find process using port 9000
lsof -i :9000

# Kill the process
kill -9 <PID>

# Or use a different port
API_PORT=9001 npm run dev
```

### Node Modules Issues

```bash
# Clean and reinstall
npm run clean
npm install
npm run db:generate
```

### Docker Daemon Issues

```bash
# Ensure Docker daemon is running
docker version

# Restart Docker
sudo systemctl restart docker  # Linux
# or restart Docker Desktop on macOS/Windows
```

## Next Steps

1. **Create your first project**
   - Log in to dashboard at http://localhost:3000
   - Create a new project linked to a GitHub repository

2. **Set up GitHub OAuth** (optional)
   - Create OAuth app at https://github.com/settings/developers
   - Add credentials to `.env`
   - Restart API server

3. **Deploy a test project**
   - Push a simple Next.js or React app to a GitHub repo
   - Link it to Vercel Clone
   - Trigger a deployment

4. **Set up custom domain** (advanced)
   - Add domain configuration in dashboard
   - Update your DNS records
   - Enable HTTPS

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Next.js Dashboard                   │
│         (http://localhost:3000)             │
└─────────────────┬───────────────────────────┘
                  │ (API calls)
                  ▼
          ┌───────────────┐
          │  Fastify API  │
          │  :9000        │
          └───────┬───────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼
    ┌─────┐  ┌──────┐   ┌──────────┐
    │ DB  │  │Redis │   │ MinIO    │
    │:5432   │:6379 │   │:9000     │
    └─────┘  └──────┘   └──────────┘
```

## Contributing

When making changes:

1. Create a feature branch
2. Make changes to the appropriate app
3. Test changes locally
4. Run linting and tests
5. Submit a pull request

## Support

- Check the [README.md](./README.md) for detailed documentation
- Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review API endpoints in `apps/api/src/routes/`
- Check logs with `npm run docker:logs`

## Next Phase Implementation

After setting up the basic system, implement:

1. ✅ Authentication system (DONE)
2. ✅ Project management API (DONE)
3. ⬜ Full dashboard UI
4. ⬜ GitHub integration and webhooks
5. ⬜ Build and deployment system
6. ⬜ Reverse proxy and domain routing
7. ⬜ Serverless functions support
8. ⬜ Custom domains and SSL certificates
9. ⬜ Monitoring and analytics
10. ⬜ Team collaboration features

Good luck! 🚀

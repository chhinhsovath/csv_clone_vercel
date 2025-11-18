# Quick Reference Guide - Vercel Clone

A quick lookup guide for common commands, file locations, and API endpoints.

## 🚀 Quick Commands

### Development Setup
```bash
# One-time setup
npm install
npm run db:generate
npm run docker:up
npm run db:push

# Daily development
npm run dev              # Start all services
npm run docker:logs      # View logs

# Cleanup
npm run clean           # Remove containers and node_modules
```

### Database
```bash
npm run db:push        # Apply schema changes
npm run db:migrate     # Create migration
npm run db:generate    # Regenerate Prisma client
```

### Docker
```bash
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:build   # Rebuild images
npm run docker:logs    # View logs
```

### Service-specific
```bash
# API Server
cd apps/api && npm run dev

# Dashboard
cd apps/dashboard && npm run dev

# Build Service
cd apps/build-service && npm run dev

# Reverse Proxy
cd apps/reverse-proxy && npm run dev
```

## 📁 Important File Locations

```
Configuration
├── .env.example                 # Environment template
├── docker-compose.yml           # Docker services
└── prisma/schema.prisma        # Database schema

API Server
├── apps/api/src/index.ts       # Server entry point
├── apps/api/src/routes/        # API endpoints
├── apps/api/src/lib/           # Utilities (logger, errors, etc.)
├── apps/api/src/middleware/    # Auth, error handling

Database
├── prisma/schema.prisma        # Schema definition
└── prisma/migrations/          # Migration files

Documentation
├── README.md                   # Main documentation
├── ARCHITECTURE.md             # System design
├── GETTING_STARTED.md          # Setup guide
├── IMPLEMENTATION_SUMMARY.md   # What's been built
├── ROADMAP.md                  # Future phases
└── QUICK_REFERENCE.md          # This file
```

## 🔐 API Authentication

### Get Authentication Token

```bash
# Register
curl -X POST http://localhost:9000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "User Name"
  }'

# Response includes: token

# Login
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Use Token in Requests

```bash
TOKEN="your_jwt_token_here"

# Protected endpoint
curl http://localhost:9000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Deployments
- `GET /api/deployments` - List deployments (TBD)
- `POST /api/projects/:id/deployments` - Create deployment (TBD)
- `GET /api/deployments/:id` - Get deployment (TBD)

### Domains
- `GET /api/domains` - List domains (TBD)
- `POST /api/domains` - Add domain (TBD)
- `DELETE /api/domains/:id` - Remove domain (TBD)

### Environment Variables
- `GET /api/env` - List variables (TBD)
- `POST /api/env` - Add variable (TBD)
- `DELETE /api/env/:id` - Delete variable (TBD)

## 🐳 Docker Containers

### Port Mapping

| Service | Port | URL |
|---------|------|-----|
| API Server | 9000 | http://localhost:9000 |
| Dashboard | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost |
| Redis | 6379 | localhost |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |

### Container Names

```
vercel_clone_postgres
vercel_clone_redis
vercel_clone_minio
vercel_clone_api
vercel_clone_dashboard
vercel_clone_build_service
vercel_clone_proxy
```

### Useful Commands

```bash
# View container status
docker-compose ps

# View logs for service
docker-compose logs api
docker-compose logs -f api    # Follow logs

# Execute command in container
docker-compose exec postgres psql -U vercel_user -d vercel_clone

# Connect to database
docker-compose exec postgres psql -U vercel_user -d vercel_clone

# Restart service
docker-compose restart api
```

## 💾 Database Connection

### PostgreSQL Connection String
```
postgresql://vercel_user:password@localhost:5432/vercel_clone
```

### Database Tools

```bash
# Using psql (inside container)
docker-compose exec postgres psql -U vercel_user -d vercel_clone

# Using DBeaver
- Host: localhost
- Port: 5432
- User: vercel_user
- Password: (from .env)
- Database: vercel_clone

# Using Prisma Studio
npm run prisma studio
```

## 🔍 Debugging

### Check Service Status
```bash
# API Health
curl http://localhost:9000/health

# View logs
npm run docker:logs

# Specific service logs
docker-compose logs api -f
docker-compose logs postgres -f
```

### Common Issues

```bash
# Port 9000 in use
lsof -i :9000
kill -9 <PID>

# Database connection refused
docker-compose restart postgres
docker-compose logs postgres

# Node modules issues
npm install
npm run db:generate

# Docker daemon not running
# Restart Docker Desktop or run:
sudo systemctl restart docker
```

## 📊 Environment Variables Reference

### Critical Variables
```
JWT_SECRET              # Change in production!
DB_PASSWORD             # Change in production!
MINIO_PASSWORD          # Change in production!
GITHUB_CLIENT_ID        # Get from GitHub settings
GITHUB_CLIENT_SECRET    # Get from GitHub settings
```

### Service Configuration
```
API_PORT               # API server port (default: 9000)
NODE_ENV              # development or production
DATABASE_URL          # PostgreSQL connection string
REDIS_URL             # Redis connection string
```

## 🧪 Testing APIs

### Using curl
```bash
# Register
curl -X POST http://localhost:9000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# List projects
curl http://localhost:9000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman
1. Create collection "Vercel Clone"
2. Set base URL: `http://localhost:9000`
3. Create requests for each endpoint
4. Add token to Authorization header after login

### Using VS Code REST Client
Create `requests.http`:
```http
@baseUrl = http://localhost:9000
@token =

### Register
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}

### List Projects
GET {{baseUrl}}/api/projects
Authorization: Bearer {{token}}
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| README.md | Main project documentation |
| ARCHITECTURE.md | System design and architecture |
| GETTING_STARTED.md | Setup and onboarding guide |
| ROADMAP.md | Detailed development roadmap |
| IMPLEMENTATION_SUMMARY.md | What's been completed |
| QUICK_REFERENCE.md | This file |

## 🛠️ Project Setup in IDE

### VS Code
```json
{
  "folders": [
    { "path": ".", "name": "Root" },
    { "path": "apps/api", "name": "API" },
    { "path": "apps/dashboard", "name": "Dashboard" }
  ],
  "settings": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "[typescript]": {
      "editor.defaultFormatter": "esbenp.prettier-vscode"
    }
  }
}
```

### WebStorm
1. Open workspace as project
2. Enable TypeScript support
3. Configure run configurations for each service
4. Set up debugger breakpoints

## 🚀 Next Phase Checklist

When starting Phase 3 (Dashboard):

- [ ] Read ROADMAP.md Phase 3 section
- [ ] Set up Next.js configuration
- [ ] Create directory structure
- [ ] Install required dependencies
- [ ] Test API connection from frontend
- [ ] Create authentication context
- [ ] Build login/signup pages
- [ ] Build project list page
- [ ] Build deployment view
- [ ] Add responsive design

## 🔗 Useful Links

- [Fastify Documentation](https://www.fastify.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Redis Documentation](https://redis.io/documentation)

## 💬 Communication Template

When reporting issues:

```markdown
**Issue**: [Brief description]

**Reproduction Steps**:
1. Step 1
2. Step 2
3. Step 3

**Expected**: What should happen
**Actual**: What actually happens

**Environment**:
- Node: [version]
- Docker: [version]
- Service: [which service]

**Logs**:
```bash
[relevant logs here]
```
```

---

**Last Updated**: 2024-11-17

For full documentation, see:
- [README.md](./README.md) - Complete overview
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide
- [ROADMAP.md](./ROADMAP.md) - Implementation phases

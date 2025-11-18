# Vercel Clone - Self-Hosted Deployment Platform

A complete, production-ready Vercel alternative for deploying web applications, serverless functions, and static sites on your own infrastructure.

## Features

- ✅ **Static Site Deployment** - Deploy HTML, CSS, JS, and static exports
- ✅ **Framework Support** - Next.js, React, Vue, Svelte, and more
- ✅ **Serverless Functions** - Deploy Node.js and Python functions
- ✅ **Git Integration** - Auto-deploy on GitHub/GitLab push
- ✅ **Custom Domains** - Use your own domain names
- ✅ **SSL/TLS Certificates** - Automatic HTTPS with Let's Encrypt
- ✅ **Environment Variables** - Secure configuration management
- ✅ **Team Collaboration** - Multi-user projects with role-based access
- ✅ **Build Logs** - Real-time deployment and build logs
- ✅ **Preview URLs** - Deploy previews for pull requests
- ✅ **Monitoring** - Performance metrics and error tracking

## Architecture

```
┌─────────────────────────────────────────────┐
│         Next.js Dashboard Frontend          │
└────────────┬────────────────────────────────┘
             │
    ┌────────▼────────┐
    │   Fastify API   │
    │   (Port 9000)   │
    └────┬────────┬───┘
         │        │
    ┌────▼───┐  ┌─┴──────────┐
    │PostgreSQL  Redis + Bull  │
    │Database    Queue System  │
    └─────────┘  └────────────┘
         │
    ┌────▼──────────────────┐
    │  Build Service        │
    │  - Clone Repo         │
    │  - Build Application  │
    │  - Upload to MinIO    │
    └────┬──────────────────┘
         │
    ┌────▼──────────────┐
    │  MinIO (S3-API)   │
    │  Static Storage   │
    └────┬──────────────┘
         │
    ┌────▼──────────────┐
    │  Reverse Proxy    │
    │  - Domain Routing │
    │  - SSL/TLS        │
    │  - Asset Serving  │
    └───────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **API Server** | Fastify, TypeScript, Prisma ORM |
| **Build Service** | Node.js, Docker, Bull Queue |
| **Database** | PostgreSQL 15 |
| **Cache/Queue** | Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **Reverse Proxy** | Nginx + Custom Node.js Proxy |
| **Containers** | Docker, Docker Compose |

## Prerequisites

- Docker & Docker Compose (v20+)
- Node.js 18+ and npm 9+
- Git
- At least 2GB RAM and 10GB storage
- PostgreSQL client tools (optional, for manual queries)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vercel-clone.git
cd vercel-clone
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and update:
- Database credentials
- JWT secret
- GitHub OAuth credentials (get from https://github.com/settings/developers)
- Other configuration as needed

### 3. Start All Services

```bash
npm run setup
```

This will:
- Install dependencies
- Create database schema
- Start all Docker containers

### 4. Access the Application

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:9000
- **MinIO Console**: http://localhost:9001
- **Deployments**: http://app.vercel-clone.local (configured in your hosts file)

## Development Setup

### Start Development Server

```bash
npm run dev
```

Runs all services in development mode with hot reloading.

### Database Operations

```bash
# Create new migration
npm run db:migrate

# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Docker Management

```bash
# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild containers
npm run docker:build

# Start specific service
docker-compose up -d postgres
```

## Project Structure

```
vercel-clone/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── middleware/    # Auth, validation
│   │   │   ├── controllers/   # Request handlers
│   │   │   └── utils/         # Utilities
│   │   └── Dockerfile
│   │
│   ├── dashboard/             # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   └── Dockerfile
│   │
│   ├── build-service/         # Deployment builder
│   │   ├── src/
│   │   │   ├── workers/       # Job processors
│   │   │   ├── builders/      # Framework builders
│   │   │   └── services/      # S3, Docker, etc
│   │   └── Dockerfile
│   │
│   └── reverse-proxy/         # Domain router & reverse proxy
│       ├── src/
│       │   ├── routes/
│       │   └── middleware/
│       └── Dockerfile
│
├── packages/                  # Shared utilities
│   ├── types/                # TypeScript types
│   ├── utils/                # Shared utilities
│   └── config/               # Shared config
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration files
│
├── docker-compose.yml        # Service orchestration
├── ARCHITECTURE.md           # System design
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/github` - GitHub OAuth

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Deployments
- `GET /api/projects/:id/deployments` - List deployments
- `POST /api/projects/:id/deployments` - Trigger deployment
- `GET /api/deployments/:id` - Get deployment details
- `GET /api/deployments/:id/logs` - Stream deployment logs

### Domains
- `GET /api/projects/:id/domains` - List domains
- `POST /api/projects/:id/domains` - Add domain
- `DELETE /api/domains/:id` - Remove domain
- `POST /api/domains/:id/verify` - Verify domain ownership

### Environment Variables
- `GET /api/projects/:id/env` - List variables
- `POST /api/projects/:id/env` - Add variable
- `DELETE /api/env/:id` - Delete variable

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `MINIO_*` - MinIO S3 credentials
- `GITHUB_CLIENT_ID/SECRET` - GitHub OAuth credentials
- `NEXT_PUBLIC_API_URL` - Frontend API endpoint

### Database Configuration

The system uses PostgreSQL with the schema defined in `prisma/schema.prisma`. To modify the schema:

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` and name your migration
3. Database will auto-update

## Security Considerations

- [ ] Change all default passwords in `.env`
- [ ] Set strong `JWT_SECRET`
- [ ] Enable HTTPS in production
- [ ] Use environment-specific secrets
- [ ] Restrict API access with rate limiting
- [ ] Regularly update dependencies
- [ ] Enable database backups
- [ ] Rotate deployment keys regularly

## Deployment Guide

### Production Deployment

1. **Prepare Server**
   ```bash
   # On your VPS
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

2. **Clone Repository**
   ```bash
   git clone <repo-url> /opt/vercel-clone
   cd /opt/vercel-clone
   ```

3. **Configure Production Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   vi .env
   ```

4. **Start Services**
   ```bash
   npm run docker:up
   ```

5. **Setup SSL Certificates**
   ```bash
   # Use Let's Encrypt
   docker exec vercel_clone_reverse_proxy certbot certonly \
     --webroot \
     -w /var/www/certbot \
     -d yourdomain.com \
     -d *.yourdomain.com
   ```

6. **Configure Reverse Proxy**
   - Update Nginx configuration
   - Enable HTTPS on ports 80/443
   - Set up domain routing

### Scaling Considerations

- Run multiple API instances behind a load balancer
- Use database connection pooling
- Implement Redis cluster for caching
- Distribute build jobs across multiple workers
- Use CDN for static asset distribution

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database
npm run db:reset
```

### Build Service Not Working

```bash
# Check build service logs
docker-compose logs build-service

# Verify Docker daemon is accessible
docker ps
```

### Cannot Access Deployments

```bash
# Check reverse proxy
docker-compose logs reverse-proxy

# Verify domain configuration
curl -H "Host: app.vercel-clone.local" http://localhost
```

### GitHub Integration Issues

1. Verify GitHub OAuth credentials in `.env`
2. Check webhook delivery in GitHub repository settings
3. View API logs for error details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] GitHub Actions integration
- [ ] Analytics dashboard
- [ ] Automatic performance optimization
- [ ] API rate limiting per user
- [ ] Webhook support
- [ ] Private npm registry
- [ ] Database backups
- [ ] Deployment rollback
- [ ] A/B testing
- [ ] Cost optimization

## License

MIT License - see LICENSE file for details

## Support

- 📖 [Documentation](./docs)
- 💬 [Discord Community](https://discord.gg/vercelclone)
- 🐛 [Issue Tracker](https://github.com/yourusername/vercel-clone/issues)
- 📧 Email: support@vercel-clone.local

## Acknowledgments

Built as a learning project inspired by Vercel's deployment platform architecture.

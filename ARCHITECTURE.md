# Vercel Clone - Architecture Document

## System Overview

This is a self-hosted deployment platform supporting static sites, serverless functions, Git integration, custom domains, and SSL certificates.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │    Frontend Dashboard (Next.js)        │
        │  - User authentication                 │
        │  - Project management                  │
        │  - Deployment history                  │
        │  - Settings & configuration            │
        └────────────────┬───────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐   ┌──────────┐   ┌────────────┐
    │  REST   │   │ WebSocket│   │   GitHub   │
    │   API   │   │  Logs    │   │  Webhooks  │
    │ Server  │   │  Streaming   │            │
    └──┬──────┘   └──────────┘   └─────┬──────┘
       │                              │
       │                    ┌─────────┘
       │                    │
       ▼                    ▼
  ┌──────────────────────────────────┐
  │   API Server (Node.js/Fastify)   │
  │  - Auth (JWT)                    │
  │  - Project management            │
  │  - Deployment orchestration      │
  │  - Database queries              │
  └──┬──────────────┬────────────────┘
     │              │
     │              ▼
     │         ┌──────────────────┐
     │         │   PostgreSQL     │
     │         │   Database       │
     │         └──────────────────┘
     │
     ├─────────────────────────────────┬─────────────────────┐
     │                                 │                     │
     ▼                                 ▼                     ▼
┌──────────────┐          ┌──────────────────┐    ┌──────────────┐
│ Build Queue  │          │  Build Service   │    │ Function     │
│ (Redis)      │          │  (Docker)        │    │ Runtime      │
│              │          │  - Clone repo    │    │ (Docker)     │
│              │◄─────────┤  - Build         │    │              │
│              │          │  - Optimize      │    │              │
└──────────────┘          │  - Upload assets │    └──────────────┘
                          └────────┬─────────┘
                                   │
                    ┌──────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │  MinIO (S3 API)  │
            │  Static Assets   │
            │  & Builds        │
            └────────┬─────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │   Reverse Proxy (Nginx/Node)   │
    │  - Route by domain             │
    │  - SSL termination             │
    │  - Serve static assets         │
    │  - Route to functions          │
    └────────────────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │   User Deployments             │
    │  - project.vercel-clone.com    │
    │  - custom-domain.com           │
    └────────────────────────────────┘
```

## Core Services

### 1. API Server
- **Port:** 9000
- **Framework:** Fastify + TypeScript
- **Responsibilities:**
  - User authentication & authorization
  - Project CRUD operations
  - Deployment management
  - Domain management
  - Environment variables handling
  - Logs streaming

### 2. Build Service
- **Architecture:** Worker-based with job queue
- **Tool:** Docker for containerization
- **Responsibilities:**
  - Clone Git repository
  - Detect framework (Next.js, React, Vue, static)
  - Build application
  - Optimize assets (minify, compress)
  - Upload to MinIO/S3
  - Report build status

### 3. Reverse Proxy
- **Port:** 80, 443
- **Technology:** Nginx or custom Node.js proxy
- **Responsibilities:**
  - Route requests by domain/subdomain
  - Serve static assets from MinIO
  - Route API calls to function runtime
  - SSL/TLS termination
  - Caching headers

### 4. Function Runtime
- **Architecture:** Container-based on-demand execution
- **Responsibilities:**
  - Execute serverless functions
  - Handle concurrent requests
  - Manage environment variables
  - Collect logs and metrics

## Database Schema

### Core Tables

```
users
├── id (UUID PK)
├── email (unique)
├── password_hash
├── created_at
├── updated_at

projects
├── id (UUID PK)
├── user_id (FK)
├── name
├── git_repo_url
├── git_branch (default: main)
├── build_command (default: npm run build)
├── output_directory (default: dist or .next)
├── created_at
├── updated_at

deployments
├── id (UUID PK)
├── project_id (FK)
├── git_commit_sha
├── git_branch
├── status (queued, building, deploying, failed, success)
├── build_logs (text)
├── deployment_url
├── created_at
├── deployed_at

domains
├── id (UUID PK)
├── project_id (FK)
├── domain_name
├── is_verified (bool)
├── ssl_status (pending, active, failed)
├── dns_cname_target
├── created_at

environment_variables
├── id (UUID PK)
├── project_id (FK)
├── key
├── value_encrypted
├── is_build_time (bool)
├── created_at

functions
├── id (UUID PK)
├── project_id (FK)
├── function_name
├── file_path
├── runtime (node18, python39, etc)
├── created_at
├── updated_at

logs
├── id (UUID PK)
├── deployment_id or function_id (FK)
├── log_type (build, runtime, error)
├── message (text)
├── timestamp
```

## Deployment Flow

```
1. User pushes to GitHub
   ↓
2. GitHub webhook triggers API
   ↓
3. API creates new Deployment record (status: queued)
   ↓
4. Build job added to Redis queue
   ↓
5. Build Service picks up job
   ├─ Clone repository
   ├─ Install dependencies
   ├─ Run build command
   ├─ Optimize assets
   ├─ Upload to MinIO
   └─ Update deployment status
   ↓
6. Deployment marked as "success"
   ↓
7. Reverse proxy routes traffic to new build
   ↓
8. Old builds cleaned up after retention period
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 + React + TypeScript + TailwindCSS |
| API Server | Fastify + TypeScript + Prisma ORM |
| Build Service | Node.js + Docker + Bull (queue) |
| Database | PostgreSQL |
| Cache/Queue | Redis |
| Storage | MinIO (S3-compatible) |
| Reverse Proxy | Nginx + Let's Encrypt or custom Node.js |
| Containers | Docker + Docker Compose |
| Authentication | JWT + Bcrypt |

## Security Considerations

- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens with refresh token rotation
- [ ] Environment variables encrypted at rest
- [ ] Git tokens stored securely
- [ ] API rate limiting
- [ ] CORS configuration
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection
- [ ] CSRF tokens for state-changing operations
- [ ] SSL/TLS for all communications
- [ ] Audit logging for sensitive operations

## Scalability Strategy

### Horizontal Scaling
- Multiple API server instances behind load balancer
- Multiple build workers for parallel builds
- Distributed Redis cache
- PostgreSQL replication for HA

### Vertical Scaling
- Increase server resources as traffic grows
- Database optimization (indexing, caching)
- CDN for static assets distribution

## Next Steps

1. Initialize project structure
2. Set up Docker environment
3. Create database schema (Prisma migrations)
4. Build API server with authentication
5. Create dashboard frontend
6. Implement Git integration
7. Build build service
8. Create reverse proxy
9. Add serverless functions support
10. Implement monitoring and logging

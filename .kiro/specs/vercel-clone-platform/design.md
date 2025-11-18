# Design Document - Vercel Clone Platform

## Overview

The Vercel Clone Platform is a full-stack web application that provides automated deployment and hosting services similar to Vercel. Built with Next.js 14 (App Router), React, TypeScript, and Prisma, the platform enables developers to deploy web applications through a modern UI while leveraging the existing bash-based subdomain management infrastructure.

The system architecture follows a monolithic Next.js application pattern with server-side API routes, real-time WebSocket connections for build logs, and integration with system-level processes for deployment execution.

### Key Design Principles

1. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with real-time features
2. **Security First**: All system operations run with proper privilege separation and input validation
3. **Real-time Feedback**: Users see live build logs and deployment status updates
4. **Idempotent Operations**: Deployments can be safely retried without side effects
5. **Graceful Degradation**: System continues operating even if non-critical services fail

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  (Next.js React App + WebSocket Client)                     │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Application Server                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   App Router │  │  API Routes  │  │  WebSocket   │     │
│  │   (Pages)    │  │  (REST API)  │  │   Server     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Server-Side Services Layer                 │  │
│  │  • Auth Service    • Deployment Service              │  │
│  │  • Git Service     • Build Service                   │  │
│  │  • Subdomain Service • Monitoring Service            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬──────────────────┬─────────┘
         │                      │                  │
         ▼                      ▼                  ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  File System     │  │  System Scripts │
│   Database      │  │  (Deployments)   │  │  (Bash Scripts) │
│  (Prisma ORM)   │  │                  │  │  • Nginx Config │
│                 │  │  /var/deployments│  │  • SSL Certs    │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router with React Server Components)
- React 18 with TypeScript
- TailwindCSS for styling
- Shadcn/ui component library
- React Query (TanStack Query) for data fetching
- Zustand for client-side state management

**Backend:**
- Next.js API Routes (serverless functions)
- Prisma ORM with PostgreSQL
- NextAuth.js for authentication
- Socket.io for WebSocket connections
- Node.js child_process for system operations

**Infrastructure:**
- PostgreSQL 15+ database
- Nginx (managed by existing scripts)
- Let's Encrypt SSL (via Certbot)
- PM2 for process management
- Git for repository cloning

## Components and Interfaces

### 1. Authentication System

**Component: AuthService**

```typescript
interface AuthService {
  // User authentication
  signIn(email: string, password: string): Promise<Session>
  signUp(email: string, password: string, name: string): Promise<User>
  signOut(sessionId: string): Promise<void>
  
  // Session management
  validateSession(token: string): Promise<Session | null>
  refreshSession(token: string): Promise<Session>
  
  // Password management
  resetPassword(email: string): Promise<void>
  updatePassword(userId: string, newPassword: string): Promise<void>
}

interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
}
```

**Implementation Details:**
- Uses NextAuth.js with Credentials provider
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- HTTP-only cookies for token storage
- CSRF protection enabled

### 2. Project Management

**Component: ProjectService**

```typescript
interface ProjectService {
  // Project CRUD
  createProject(data: CreateProjectInput): Promise<Project>
  getProject(projectId: string): Promise<Project>
  listProjects(userId: string): Promise<Project[]>
  updateProject(projectId: string, data: UpdateProjectInput): Promise<Project>
  deleteProject(projectId: string): Promise<void>
  
  // Project configuration
  updateBuildSettings(projectId: string, settings: BuildSettings): Promise<void>
  updateEnvironmentVariables(projectId: string, vars: EnvironmentVariable[]): Promise<void>
}

interface Project {
  id: string
  name: string
  subdomain: string
  repositoryUrl: string
  branch: string
  framework: Framework
  buildCommand: string
  outputDirectory: string
  installCommand: string
  port: number
  userId: string
  createdAt: Date
  updatedAt: Date
}

type Framework = 'nextjs' | 'react' | 'vue' | 'node' | 'static'

interface BuildSettings {
  framework: Framework
  buildCommand: string
  outputDirectory: string
  installCommand: string
  port: number
}

interface EnvironmentVariable {
  key: string
  value: string
  encrypted: boolean
}
```

### 3. Deployment System

**Component: DeploymentService**

```typescript
interface DeploymentService {
  // Deployment lifecycle
  createDeployment(projectId: string, options?: DeploymentOptions): Promise<Deployment>
  getDeployment(deploymentId: string): Promise<Deployment>
  listDeployments(projectId: string, limit?: number): Promise<Deployment[]>
  cancelDeployment(deploymentId: string): Promise<void>
  
  // Deployment operations
  startBuild(deploymentId: string): Promise<void>
  rollback(projectId: string, deploymentId: string): Promise<Deployment>
  
  // Process management
  stopDeployment(deploymentId: string): Promise<void>
  restartDeployment(deploymentId: string): Promise<void>
}

interface Deployment {
  id: string
  projectId: string
  status: DeploymentStatus
  commitHash: string
  commitMessage: string
  branch: string
  buildLog: string
  startedAt: Date
  completedAt: Date | null
  duration: number | null
  processId: number | null
  url: string
}

type DeploymentStatus = 
  | 'queued'
  | 'cloning'
  | 'building'
  | 'deploying'
  | 'running'
  | 'running-no-ssl'
  | 'failed'
  | 'cancelled'
  | 'stopped'

interface DeploymentOptions {
  branch?: string
  commitHash?: string
  environmentVariables?: Record<string, string>
}
```

**Deployment Pipeline:**

```
1. Queue → 2. Clone → 3. Install → 4. Build → 5. Start → 6. Configure → 7. Running
                                                              ↓
                                                         Setup Nginx
                                                         Install SSL
```

### 4. Build System

**Component: BuildService**

```typescript
interface BuildService {
  // Build execution
  executeBuild(deployment: Deployment, project: Project): Promise<BuildResult>
  streamBuildLogs(deploymentId: string, callback: (log: string) => void): void
  cancelBuild(deploymentId: string): Promise<void>
  
  // Build utilities
  detectFramework(repoPath: string): Promise<Framework>
  validateBuildOutput(outputPath: string): Promise<boolean>
}

interface BuildResult {
  success: boolean
  outputPath: string
  logs: string
  duration: number
  error?: string
}

interface BuildContext {
  deploymentId: string
  projectId: string
  workingDirectory: string
  environmentVariables: Record<string, string>
  buildCommand: string
  installCommand: string
}
```

**Build Process Implementation:**

```typescript
class BuildExecutor {
  async execute(context: BuildContext): Promise<BuildResult> {
    const startTime = Date.now()
    let logs = ''
    
    try {
      // 1. Clone repository
      logs += await this.cloneRepository(context)
      
      // 2. Install dependencies
      logs += await this.installDependencies(context)
      
      // 3. Run build command
      logs += await this.runBuild(context)
      
      // 4. Validate output
      const isValid = await this.validateOutput(context)
      
      return {
        success: isValid,
        outputPath: context.workingDirectory,
        logs,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        logs,
        duration: Date.now() - startTime,
        error: error.message
      }
    }
  }
}
```

### 5. Subdomain Management Integration

**Component: SubdomainService**

```typescript
interface SubdomainService {
  // Subdomain operations
  createSubdomain(subdomain: string, port: number, email: string): Promise<SubdomainResult>
  removeSubdomain(subdomain: string): Promise<void>
  checkSubdomainAvailability(subdomain: string): Promise<boolean>
  
  // SSL management
  installSSL(subdomain: string, email: string): Promise<SSLResult>
  renewSSL(subdomain: string): Promise<void>
  checkSSLStatus(subdomain: string): Promise<SSLStatus>
  
  // Nginx operations
  reloadNginx(): Promise<void>
  testNginxConfig(): Promise<boolean>
}

interface SubdomainResult {
  success: boolean
  subdomain: string
  nginxConfigPath: string
  sslInstalled: boolean
  error?: string
}

interface SSLResult {
  success: boolean
  certificatePath: string
  expiresAt: Date
  error?: string
}

interface SSLStatus {
  installed: boolean
  expiresAt: Date | null
  daysRemaining: number | null
}
```

**Integration with Bash Scripts:**

```typescript
class SubdomainScriptExecutor {
  private readonly SCRIPT_PATH = '/path/to/prd'
  
  async createSubdomain(subdomain: string, port: number, email: string): Promise<SubdomainResult> {
    const scriptPath = `${this.SCRIPT_PATH}/quick-subdomain.sh`
    
    // Execute bash script with proper error handling
    const result = await this.executeScript(scriptPath, [
      subdomain,
      port.toString(),
      email
    ])
    
    // Parse script output
    return this.parseScriptOutput(result)
  }
  
  private async executeScript(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('sudo', [script, ...args])
      let output = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Script exited with code ${code}`))
        }
      })
    })
  }
}
```

### 6. Git Integration

**Component: GitService**

```typescript
interface GitService {
  // Repository operations
  cloneRepository(url: string, destination: string, branch?: string): Promise<void>
  validateRepository(url: string): Promise<RepositoryInfo>
  getCommitInfo(repoPath: string): Promise<CommitInfo>
  
  // Webhook management
  registerWebhook(projectId: string, repositoryUrl: string): Promise<Webhook>
  unregisterWebhook(webhookId: string): Promise<void>
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean
}

interface RepositoryInfo {
  url: string
  accessible: boolean
  defaultBranch: string
  framework?: Framework
}

interface CommitInfo {
  hash: string
  message: string
  author: string
  timestamp: Date
}

interface Webhook {
  id: string
  projectId: string
  url: string
  secret: string
  events: string[]
}
```

### 7. Real-time Communication

**Component: WebSocketService**

```typescript
interface WebSocketService {
  // Connection management
  connect(userId: string, socket: Socket): void
  disconnect(socketId: string): void
  
  // Event broadcasting
  broadcastDeploymentStatus(deploymentId: string, status: DeploymentStatus): void
  streamBuildLog(deploymentId: string, logLine: string): void
  broadcastNotification(userId: string, notification: Notification): void
}

interface Socket {
  id: string
  userId: string
  emit(event: string, data: any): void
  on(event: string, handler: (data: any) => void): void
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: Date
  link?: string
}
```

### 8. Monitoring System

**Component: MonitoringService**

```typescript
interface MonitoringService {
  // Resource metrics
  getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics>
  getProjectMetrics(projectId: string, timeRange: TimeRange): Promise<ProjectMetrics>
  
  // Health checks
  checkDeploymentHealth(deploymentId: string): Promise<HealthStatus>
  monitorDeployment(deploymentId: string): void
}

interface DeploymentMetrics {
  cpuUsage: number // percentage
  memoryUsage: number // MB
  requestCount: number
  errorRate: number
  uptime: number // seconds
}

interface ProjectMetrics {
  totalRequests: number
  averageResponseTime: number
  errorCount: number
  deploymentCount: number
  uptimePercentage: number
}

interface HealthStatus {
  healthy: boolean
  processRunning: boolean
  responding: boolean
  lastChecked: Date
}

type TimeRange = '1h' | '24h' | '7d' | '30d'
```

## Data Models

### Database Schema (Prisma)

```prisma
// User and Authentication
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  projects      Project[]
  sessions      Session[]
  teamMembers   TeamMember[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
}

// Projects
model Project {
  id                String    @id @default(cuid())
  name              String
  subdomain         String    @unique
  repositoryUrl     String
  branch            String    @default("main")
  framework         String
  buildCommand      String
  outputDirectory   String
  installCommand    String    @default("npm install")
  port              Int
  userId            String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  deployments       Deployment[]
  environmentVars   EnvironmentVariable[]
  webhooks          Webhook[]
  teamMembers       TeamMember[]
  customDomains     CustomDomain[]
  
  @@index([userId])
  @@index([subdomain])
}

// Deployments
model Deployment {
  id            String    @id @default(cuid())
  projectId     String
  status        String
  commitHash    String
  commitMessage String
  branch        String
  buildLog      String    @db.Text
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  duration      Int?
  processId     Int?
  url           String
  
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([status])
  @@index([startedAt])
}

// Environment Variables
model EnvironmentVariable {
  id          String   @id @default(cuid())
  projectId   String
  key         String
  value       String   @db.Text // Encrypted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, key])
  @@index([projectId])
}

// Webhooks
model Webhook {
  id          String   @id @default(cuid())
  projectId   String
  url         String
  secret      String
  events      String[] // JSON array
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
}

// Team Collaboration
model TeamMember {
  id          String   @id @default(cuid())
  projectId   String
  userId      String
  role        String   // owner, admin, viewer
  invitedAt   DateTime @default(now())
  acceptedAt  DateTime?
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

// Custom Domains
model CustomDomain {
  id          String   @id @default(cuid())
  projectId   String
  domain      String   @unique
  verified    Boolean  @default(false)
  sslInstalled Boolean @default(false)
  createdAt   DateTime @default(now())
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
}
```

### File System Structure

```
/var/deployments/
├── {project-id}/
│   ├── current/              # Current active deployment
│   │   ├── .git/
│   │   ├── node_modules/
│   │   ├── .next/           # Build output
│   │   └── ...
│   ├── releases/            # Historical deployments
│   │   ├── {deployment-id-1}/
│   │   ├── {deployment-id-2}/
│   │   └── ...
│   └── logs/
│       ├── build.log
│       ├── runtime.log
│       └── error.log
```

## Error Handling

### Error Classification

```typescript
enum ErrorCode {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS = 1001,
  SESSION_EXPIRED = 1002,
  UNAUTHORIZED = 1003,
  
  // Project errors (2xxx)
  PROJECT_NOT_FOUND = 2001,
  SUBDOMAIN_TAKEN = 2002,
  INVALID_REPOSITORY = 2003,
  
  // Deployment errors (3xxx)
  BUILD_FAILED = 3001,
  DEPLOYMENT_TIMEOUT = 3002,
  PORT_IN_USE = 3003,
  SSL_INSTALLATION_FAILED = 3004,
  
  // System errors (4xxx)
  NGINX_CONFIG_ERROR = 4001,
  DISK_SPACE_FULL = 4002,
  PROCESS_START_FAILED = 4003,
}

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
  }
}
```

### Error Recovery Strategies

1. **Build Failures**: Preserve logs, allow retry, suggest fixes
2. **SSL Failures**: Retry with exponential backoff (3 attempts), fallback to HTTP
3. **Process Crashes**: Auto-restart with PM2, alert after 3 failures
4. **Database Errors**: Transaction rollback, connection pool recovery
5. **Git Clone Failures**: Clean workspace, retry with fresh clone

### Logging Strategy

```typescript
interface LogEntry {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  message: string
  context?: Record<string, any>
  error?: Error
}

// Structured logging with Winston
logger.info('Deployment started', {
  deploymentId: 'dep_123',
  projectId: 'proj_456',
  userId: 'user_789'
})
```

## Testing Strategy

### Unit Tests
- Service layer methods (80% coverage target)
- Utility functions (100% coverage)
- Data validation logic
- Error handling paths

### Integration Tests
- API endpoints with database
- Authentication flows
- Deployment pipeline stages
- Webhook processing

### End-to-End Tests
- Complete deployment workflow
- User authentication and project creation
- Build log streaming
- Rollback functionality

### Test Tools
- Jest for unit/integration tests
- Playwright for E2E tests
- Supertest for API testing
- Mock Service Worker for API mocking

## Security Considerations

### Input Validation
- All user inputs sanitized and validated
- Repository URLs validated against allowed patterns
- Subdomain names restricted to alphanumeric and hyphens
- Environment variable keys/values length-limited

### Privilege Separation
- Web application runs as non-root user
- Sudo access only for specific scripts via sudoers configuration
- Build processes run in isolated directories
- Process isolation with separate user accounts

### Secrets Management
- Environment variables encrypted at rest (AES-256)
- JWT secrets stored in environment variables
- Webhook secrets generated with crypto.randomBytes
- Database credentials in secure environment config

### Rate Limiting
- API endpoints: 100 requests/minute per user
- Deployment creation: 10 per hour per project
- Webhook endpoints: 1000 requests/hour per project

### CORS and CSP
- Strict CORS policy for API routes
- Content Security Policy headers
- CSRF protection on all mutations
- Secure cookie flags (httpOnly, secure, sameSite)

## Performance Optimization

### Caching Strategy
- React Query for client-side data caching (5-minute stale time)
- Server-side caching with Redis for deployment status
- Static page generation for marketing pages
- CDN caching for static assets

### Database Optimization
- Indexed columns: userId, projectId, status, subdomain
- Connection pooling (max 20 connections)
- Query optimization with Prisma query analysis
- Pagination for list endpoints (default 20 items)

### Build Optimization
- Parallel dependency installation where possible
- Build artifact caching between deployments
- Incremental builds for supported frameworks
- Build timeout: 15 minutes maximum

## Deployment and Operations

### Application Deployment
- PM2 for process management
- Environment-based configuration
- Health check endpoint: `/api/health`
- Graceful shutdown handling

### Monitoring and Alerts
- Application logs aggregated to files
- Error tracking with Sentry (optional)
- Uptime monitoring for deployed applications
- Disk space alerts at 80% capacity

### Backup Strategy
- Database backups: Daily automated backups
- Deployment artifacts: Retained for 30 days
- Configuration backups before changes
- SSL certificate backups

### Scaling Considerations
- Horizontal scaling: Multiple Next.js instances behind load balancer
- Database: PostgreSQL replication for read scaling
- File storage: Shared NFS or object storage for deployments
- WebSocket: Redis adapter for multi-instance support

## Future Enhancements

1. **Docker Support**: Deploy containerized applications
2. **Preview Deployments**: Automatic deployments for pull requests
3. **Analytics Dashboard**: Detailed traffic and performance analytics
4. **Edge Functions**: Serverless function deployment
5. **Database Provisioning**: Automatic PostgreSQL/MySQL database creation
6. **CI/CD Integration**: GitHub Actions, GitLab CI integration
7. **Multi-region**: Deploy to multiple geographic regions
8. **A/B Testing**: Traffic splitting between deployments

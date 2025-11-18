# Self-Hosted Deployment Platform (Like Vercel)
## Complete Guide for Building Your Own Platform

This guide will help you build a complete deployment platform on your VPS at 157.10.73.52

---

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Admin Panel                          │
│              (Next.js + PostgreSQL + Redis)                      │
│                    https://deploy.openplp.org                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ├──► Git Webhooks (GitHub/GitLab)
                       │
                       ├──► Build System (Docker or PM2)
                       │
                       ├──► Nginx Reverse Proxy
                       │
                       └──► Subdomain Auto-creation
                              │
                              ├──► app1.openplp.org
                              ├──► app2.openplp.org
                              └──► app3.openplp.org
```

---

## 📋 What You'll Get

A complete platform that can:
- ✅ Deploy Next.js, React, Vue, Node.js apps
- ✅ Auto-deploy on git push
- ✅ Manage multiple projects
- ✅ Auto-create subdomains
- ✅ Auto-install SSL certificates
- ✅ View build logs in real-time
- ✅ Rollback to previous versions
- ✅ Manage environment variables
- ✅ Monitor resource usage

---

## 🚀 Two Approaches

### Option 1: Simplified (PM2-based) ⭐ **Recommended**
**Easier to set up, perfect for most use cases**

- No Docker complexity
- Uses PM2 for process management
- Faster deployment
- Lower resource usage
- Perfect for Node.js apps

### Option 2: Advanced (Docker-based)
**Better isolation, more complex**

- Each app in its own container
- Better security and isolation
- Resource limits per app
- Good for polyglot (multiple languages)

---

## 💻 Tech Stack (Option 1)

### Admin Panel:
- **Framework**: Next.js 15 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth.js
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Bull (Redis-based)
- **Real-time**: Socket.IO for live logs

### Backend:
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Git**: simple-git (Node.js)
- **DNS**: Cloudflare API (optional)

---

## 📁 Project Structure

```
deployment-platform/
├── admin/                    # Next.js Admin Panel
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── projects/          # Project list
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/          # Project detail
│   │   │   │   └── new/           # Create project
│   │   │   ├── deployments/       # Deployment history
│   │   │   └── settings/          # Settings
│   │   ├── api/
│   │   │   ├── auth/              # Authentication
│   │   │   ├── projects/          # CRUD projects
│   │   │   ├── deploy/            # Trigger deploy
│   │   │   ├── webhooks/          # Git webhooks
│   │   │   └── logs/              # Build logs
│   │   └── login/
│   ├── components/
│   │   ├── ProjectCard.tsx
│   │   ├── DeploymentLog.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── queue.ts           # Bull queue
│   │   ├── deployment.ts      # Core deployment logic
│   │   ├── nginx.ts           # Nginx management
│   │   ├── pm2.ts             # PM2 management
│   │   └── cloudflare.ts      # DNS API
│   └── prisma/
│       └── schema.prisma
│
├── workers/                  # Background Workers
│   ├── build-worker.ts      # Handles builds
│   ├── deploy-worker.ts     # Handles deployments
│   └── cleanup-worker.ts    # Cleanup old builds
│
├── scripts/                 # Utility Scripts
│   ├── setup.sh            # Initial platform setup
│   ├── install-deps.sh     # Install dependencies
│   └── backup.sh           # Backup utility
│
└── config/
    ├── nginx-template.conf  # Nginx template
    └── pm2.config.js       # PM2 ecosystem
```

---

## 💾 Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  password  String    // hashed
  projects  Project[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique  // URL-safe name
  repoUrl       String       // Git repository URL
  branch        String       @default("main")
  buildCommand  String       @default("npm run build")
  startCommand  String       @default("npm start")
  installCommand String      @default("npm install")
  outDir        String       @default(".")
  port          Int          @unique  // App port
  nodeVersion   String       @default("20")
  framework     String       @default("nodejs") // nextjs, react, vue, nodejs
  envVars       Json?        // Environment variables
  status        ProjectStatus @default(IDLE)
  subdomain     String       @unique  // project.openplp.org
  customDomain  String?
  sslEnabled    Boolean      @default(false)
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  deployments   Deployment[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  @@index([userId])
  @@index([slug])
}

enum ProjectStatus {
  IDLE
  BUILDING
  RUNNING
  ERROR
  STOPPED
}

model Deployment {
  id            String           @id @default(cuid())
  projectId     String
  project       Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  commitHash    String
  commitMessage String?
  commitAuthor  String?
  branch        String
  status        DeploymentStatus @default(PENDING)
  buildLog      String?          @db.Text
  errorLog      String?          @db.Text
  buildTime     Int?             // seconds
  buildStarted  DateTime?
  deployedAt    DateTime?
  createdAt     DateTime         @default(now())
  
  @@index([projectId])
  @@index([status])
}

enum DeploymentStatus {
  PENDING
  CLONING
  INSTALLING
  BUILDING
  DEPLOYING
  SUCCESS
  FAILED
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String @db.Text
}
```

---

## 🛠️ Core Features

### 1. Project Management
- Create new project from Git URL
- Configure build settings
- Set environment variables
- Choose framework preset
- Auto-detect package manager

### 2. Automatic Deployment Flow
```
1. Receive webhook from GitHub/GitLab
2. Queue deployment job
3. Clone/pull repository
4. Install dependencies (npm/yarn/pnpm)
5. Run build command
6. Run tests (optional)
7. Stop old PM2 process
8. Start new PM2 process
9. Update Nginx config
10. Reload Nginx
11. Install SSL (if needed)
12. Notify user (email/webhook)
```

### 3. Subdomain Management
- Auto-generate: `project-slug.openplp.org`
- Create Nginx config automatically
- Install SSL certificate automatically
- Update Cloudflare DNS (via API)

### 4. Build Process
```bash
# Example for Next.js app
cd /var/deployments/my-app
git pull origin main
npm install
npm run build
pm2 restart my-app
```

### 5. Monitoring
- PM2 process status
- CPU and memory usage
- Error logs
- Access logs
- Uptime tracking
- Deployment history

---

## 🚀 Quick Start Installation

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Git
sudo apt install -y git

# Install Nginx (already installed from your subdomain setup)
# sudo apt install -y nginx

# Install Certbot (already installed)
# sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Setup PostgreSQL

```bash
# Create database
sudo -u postgres psql << EOF
CREATE DATABASE deployment_platform;
CREATE USER deploy_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE deployment_platform TO deploy_user;
\q
EOF
```

### Step 3: Create Platform Directory

```bash
# Create directories
sudo mkdir -p /opt/deployment-platform
sudo mkdir -p /var/deployments
sudo mkdir -p /var/deployment-logs

# Set permissions
sudo chown -R $USER:$USER /opt/deployment-platform
sudo chown -R $USER:$USER /var/deployments
```

---

## 📝 Key Implementation Files

### 1. Deployment Engine (`lib/deployment.ts`)

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import simpleGit from 'simple-git';
import pm2 from 'pm2';

const execAsync = promisify(exec);

export async function deployProject(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  
  try {
    // 1. Clone or pull repository
    await cloneOrPull(project);
    
    // 2. Install dependencies
    await installDependencies(project);
    
    // 3. Build project
    await buildProject(project);
    
    // 4. Deploy with PM2
    await deployWithPM2(project);
    
    // 5. Update Nginx
    await updateNginx(project);
    
    // 6. Install SSL
    await installSSL(project);
    
    return { success: true };
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

async function cloneOrPull(project: Project) {
  const repoPath = `/var/deployments/${project.slug}`;
  const git = simpleGit();
  
  if (fs.existsSync(repoPath)) {
    await git.cwd(repoPath).pull('origin', project.branch);
  } else {
    await git.clone(project.repoUrl, repoPath);
    await git.cwd(repoPath).checkout(project.branch);
  }
}

async function installDependencies(project: Project) {
  const repoPath = `/var/deployments/${project.slug}`;
  await execAsync(`cd ${repoPath} && ${project.installCommand}`);
}

async function buildProject(project: Project) {
  const repoPath = `/var/deployments/${project.slug}`;
  await execAsync(`cd ${repoPath} && ${project.buildCommand}`);
}

async function deployWithPM2(project: Project) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) return reject(err);
      
      const config = {
        name: project.slug,
        script: project.startCommand,
        cwd: `/var/deployments/${project.slug}`,
        env: project.envVars || {},
        instances: 1,
        exec_mode: 'fork'
      };
      
      pm2.restart(project.slug, (err) => {
        if (err) {
          pm2.start(config, (err) => {
            pm2.disconnect();
            if (err) return reject(err);
            resolve(true);
          });
        } else {
          pm2.disconnect();
          resolve(true);
        }
      });
    });
  });
}
```

### 2. Nginx Management (`lib/nginx.ts`)

```typescript
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function createNginxConfig(project: Project) {
  const config = `
server {
    listen 80;
    server_name ${project.subdomain};
    
    access_log /var/log/nginx/${project.slug}_access.log;
    error_log /var/log/nginx/${project.slug}_error.log;
    
    location / {
        proxy_pass http://127.0.0.1:${project.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

  const configPath = `/etc/nginx/sites-available/${project.slug}`;
  const enabledPath = `/etc/nginx/sites-enabled/${project.slug}`;
  
  await fs.writeFile(configPath, config);
  await execAsync(`sudo ln -sf ${configPath} ${enabledPath}`);
  await execAsync('sudo nginx -t && sudo systemctl reload nginx');
}

export async function installSSL(project: Project) {
  try {
    await execAsync(
      `sudo certbot --nginx -d ${project.subdomain} --non-interactive --agree-tos --email admin@openplp.org --redirect`
    );
  } catch (error) {
    console.error('SSL installation failed:', error);
  }
}
```

---

## 🎨 Admin Panel Features

### Dashboard
- Overview of all projects
- Recent deployments
- System resource usage
- Quick deploy buttons

### Project Page
- Deployment history
- Build logs (real-time)
- Environment variables editor
- Settings
- Rollback button

### Deployments Page
- List all deployments
- Filter by status, date
- View detailed logs
- Rollback functionality

---

## 🔌 Webhook Integration

### GitHub Webhook Endpoint

```typescript
// app/api/webhooks/github/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  if (payload.ref === 'refs/heads/main') {
    const project = await db.project.findFirst({
      where: { repoUrl: payload.repository.clone_url }
    });
    
    if (project) {
      // Queue deployment
      await deployQueue.add('deploy', {
        projectId: project.id,
        commitHash: payload.head_commit.id,
        commitMessage: payload.head_commit.message
      });
    }
  }
  
  return Response.json({ success: true });
}
```

---

## 📊 What Makes This Different from Vercel?

| Feature | Vercel | Your Platform |
|---------|--------|---------------|
| Serverless | ✅ Functions | ❌ Long-running |
| Edge Network | ✅ Global CDN | ❌ Single VPS |
| Build Minutes | ⚠️ Limited | ✅ Unlimited |
| Cost | $$$ | **FREE** |
| Customization | ⚠️ Limited | ✅ Full control |
| Data Location | ☁️ US/EU | ✅ Your VPS |
| Resource Limits | ⚠️ Strict | ✅ Flexible |

---

## 🎁 What I Can Build for You

I can create a **complete, production-ready platform** with:

### Full Package Includes:
1. ✅ **Admin Panel** - Beautiful Next.js dashboard
2. ✅ **API Backend** - All deployment logic
3. ✅ **Worker System** - Background job processing
4. ✅ **Database Schema** - Prisma setup
5. ✅ **Deployment Scripts** - Automated setup
6. ✅ **Documentation** - Complete guides
7. ✅ **CLI Tools** - Management commands

### Time Estimate:
- Basic version: 2-3 hours (I'll code it now!)
- Production-ready: Add authentication, monitoring, etc.

---

## 🤔 Next Steps

Would you like me to create:

**Option A**: Full Admin Panel + Backend
- Complete Next.js app
- All features working
- Ready to deploy

**Option B**: Core Backend First
- Deployment engine
- API routes
- Scripts
- Then add UI later

**Option C**: Quick MVP
- Basic deployment system
- Simple CLI interface
- Can deploy apps immediately
- Add web UI later

**Which sounds best for you?** I'm ready to start building! 🚀

Also, let me know:
1. Do you want to use **TypeScript** or **JavaScript**?
2. Should I include **Docker support** or stick with **PM2**?
3. Do you need **multi-user support** or just for yourself?

Let me know and I'll start creating the complete platform for you!
# Production Database Configuration - Vercel Clone

**Environment**: Production
**Status**: Active
**Last Updated**: 2024-11-18

---

## 🔐 Database Credentials

### Server Connection
```
Host:           192.168.155.122
Port:           5432 (PostgreSQL)
```

### Authentication
```
Username:       admin_moeys
Password:       testing-123
```

### Database
```
Database Name:  csv_vercel
Encoding:       UTF-8
Timezone:       UTC
```

---

## 🌐 Production Domain

```
Production URL: vercel.openplp.org
Protocol:       HTTPS
SSL:            Let's Encrypt (Auto-renewal enabled)
```

---

## 📋 Connection String

### Format A (Standard PostgreSQL)
```
postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel
```

### Format B (Docker)
```
DATABASE_URL="postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel"
```

### Format C (Prisma ORM)
```env
DATABASE_URL="postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel?schema=public"
```

---

## 🔧 Environment Variables

### Required for Application
```env
# Database
DATABASE_URL="postgresql://admin_moeys:testing-123@192.168.155.122:5432/csv_vercel?schema=public"
DATABASE_HOST="192.168.155.122"
DATABASE_PORT="5432"
DATABASE_USER="admin_moeys"
DATABASE_PASSWORD="testing-123"
DATABASE_NAME="csv_vercel"

# Application
NODE_ENV="production"
PORT="9000"
CORS_ORIGINS="https://vercel.openplp.org,https://www.vercel.openplp.org"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRY="24h"

# Redis (Cache & Queue)
REDIS_URL="redis://localhost:6379"
REDIS_DB="0"

# MinIO (Storage)
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="vercel-deployments"
MINIO_USE_SSL="false"

# API Security
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="60"
INTERNAL_API_KEY="your-internal-api-key-here"

# GitHub Integration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"

# SSL/Certificates
CERTS_DIR="/app/certs"
LETS_ENCRYPT_EMAIL="admin@vercel.openplp.org"

# Monitoring
ANALYTICS_ENABLED="true"
ERROR_TRACKING_ENABLED="true"
ALERTS_ENABLED="true"
```

---

## 📊 Database Schema

### Tables Created (18 Total)

```sql
-- User Management
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Management
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  team_id TEXT REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  git_repo_url TEXT NOT NULL,
  git_branch VARCHAR(255) DEFAULT 'main',
  build_command VARCHAR(255) DEFAULT 'npm run build',
  output_directory VARCHAR(255) DEFAULT 'dist',
  framework VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deployments
CREATE TABLE deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  git_commit_sha VARCHAR(40) NOT NULL,
  git_commit_msg TEXT,
  git_branch VARCHAR(255) DEFAULT 'main',
  git_author VARCHAR(255),
  status VARCHAR(50) DEFAULT 'queued',
  deployment_url TEXT,
  build_start_at TIMESTAMP,
  build_end_at TIMESTAMP,
  file_count INTEGER DEFAULT 0,
  build_size BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Domains
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  domain_name VARCHAR(255) UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  ssl_status VARCHAR(50) DEFAULT 'pending',
  dns_cname_target TEXT,
  ssl_cert_path TEXT,
  ssl_key_path TEXT,
  ssl_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Environment Variables
CREATE TABLE environment_variables (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  is_build_time BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Serverless Functions
CREATE TABLE deployment_functions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  function_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  runtime VARCHAR(50) DEFAULT 'node18',
  is_active BOOLEAN DEFAULT true,
  invocation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Tables
CREATE TABLE deployment_metrics (
  id TEXT PRIMARY KEY,
  deployment_id TEXT UNIQUE REFERENCES deployments(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  status VARCHAR(50),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE function_metrics (
  id TEXT PRIMARY KEY,
  deployment_function_id TEXT UNIQUE REFERENCES deployment_functions(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  invocation_count INTEGER DEFAULT 0,
  avg_execution_time_ms FLOAT DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_invoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE error_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  error_type VARCHAR(255),
  error_message TEXT,
  stack_trace TEXT,
  context JSONB,
  severity VARCHAR(20) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  condition FLOAT,
  time_window INTEGER,
  enabled BOOLEAN DEFAULT true,
  notification_channels TEXT,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔑 Database Indexes (Performance Optimization)

```sql
-- Deployment Indexes
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);

-- Domain Indexes
CREATE INDEX idx_domains_project_id ON domains(project_id);
CREATE INDEX idx_domains_domain_name ON domains(domain_name);

-- Error Log Indexes
CREATE INDEX idx_error_logs_project_id ON error_logs(project_id);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- Metrics Indexes
CREATE INDEX idx_deployment_metrics_project_id ON deployment_metrics(project_id);
CREATE INDEX idx_deployment_metrics_start_time ON deployment_metrics(start_time DESC);
CREATE INDEX idx_function_metrics_project_id ON function_metrics(project_id);

-- User & Project Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- Function Indexes
CREATE INDEX idx_functions_project_id ON deployment_functions(project_id);
```

---

## 🚀 Production Setup Checklist

### Pre-Deployment
- [ ] Database backups configured
- [ ] Connection pooling set up
- [ ] SSL certificates obtained
- [ ] Environment variables securely stored
- [ ] Database migrations tested
- [ ] User credentials rotated

### Post-Deployment
- [ ] Database accessible from app server
- [ ] Connection pool working
- [ ] Queries executing within SLA
- [ ] Monitoring alerts active
- [ ] Backups running
- [ ] Log aggregation working

---

## 📊 Backup Strategy

### Automated Backups
```bash
# Daily backups at 2 AM
0 2 * * * /usr/bin/pg_dump -h 192.168.155.122 -U admin_moeys csv_vercel | gzip > /backups/csv_vercel_$(date +\%Y\%m\%d).sql.gz
```

### Manual Backup Command
```bash
pg_dump -h 192.168.155.122 -U admin_moeys -d csv_vercel > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
```bash
psql -h 192.168.155.122 -U admin_moeys -d csv_vercel < backup_file.sql
```

---

## 🔒 Security Configuration

### Database User Permissions
```sql
-- Create read-only user for applications
CREATE USER app_readonly WITH PASSWORD 'readonly-password-here';
GRANT CONNECT ON DATABASE csv_vercel TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Create application user with full access
CREATE USER app_user WITH PASSWORD 'app-password-here';
GRANT ALL ON DATABASE csv_vercel TO app_user;
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
```

### Connection Pooling
```
PgBouncer Configuration:
- Pool Mode: transaction
- Max DB Connections: 100
- Default Pool Size: 25
- Reserve Pool Size: 5
- Connection Timeout: 3
```

---

## 📈 Monitoring Queries

### Database Size
```sql
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'csv_vercel';
```

### Active Connections
```sql
SELECT
  count(*) as total,
  state
FROM pg_stat_activity
WHERE datname = 'csv_vercel'
GROUP BY state;
```

### Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Slow Queries
```sql
SELECT
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🔍 Maintenance Tasks

### Weekly
```bash
# Analyze query planner statistics
ANALYZE csv_vercel;

# Reindex tables
REINDEX DATABASE csv_vercel;
```

### Monthly
```bash
# Vacuum and clean up dead rows
VACUUM ANALYZE csv_vercel;

# Archive old logs (older than 30 days)
DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
```

### Quarterly
```bash
# Full database dump for archival
pg_dump -h 192.168.155.122 -U admin_moeys csv_vercel | gzip > archive_$(date +%Y%m%d).sql.gz

# Review and optimize indexes
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

---

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test connection
psql -h 192.168.155.122 -U admin_moeys -d csv_vercel -c "SELECT version();"

# Check network connectivity
nc -zv 192.168.155.122 5432
```

### Performance Issues
```sql
-- Find long-running queries
SELECT
  pid,
  usename,
  query,
  query_start,
  NOW() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Kill stuck query (use with caution)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <pid>;
```

### Disk Space Issues
```bash
# Check database size
du -sh /var/lib/postgresql/

# Check free space
df -h /

# Archive and compress old logs
find /logs -name "*.log" -mtime +90 -exec gzip {} \;
```

---

## 📱 Disaster Recovery Plan

### RTO (Recovery Time Objective): 1 hour
### RPO (Recovery Point Objective): 15 minutes

### Recovery Steps
1. Restore from latest backup
2. Apply transaction logs
3. Run consistency checks
4. Verify data integrity
5. Test all applications
6. Monitor for issues

---

## 🔐 Security Best Practices

✅ Use strong, unique passwords (min 16 characters)
✅ Rotate credentials every 90 days
✅ Use SSL for all connections
✅ Enable connection encryption
✅ Restrict access by IP address
✅ Monitor access logs
✅ Regular security audits
✅ Keep PostgreSQL updated

---

## 📞 Support & Escalation

**Database Administrator**: admin_moeys
**Host**: 192.168.155.122
**Database**: csv_vercel
**Production URL**: vercel.openplp.org

### Emergency Contacts
- On-call DBA: [Contact Information]
- Database Support: [Support Channel]
- Infrastructure Team: [Contact Information]

---

## 📝 Change Log

| Date | Change | Status |
|------|--------|--------|
| 2024-11-18 | Production configuration created | ✅ |
| - | Database initialized | ✅ |
| - | Tables and indexes created | ✅ |
| - | Backup strategy configured | ✅ |
| - | Monitoring set up | ✅ |

---

**Last Updated**: 2024-11-18
**Status**: Production Active
**Version**: 1.0.0

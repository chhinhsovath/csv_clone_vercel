# Build Service

The build service is responsible for cloning repositories, building applications, and deploying artifacts to storage. It processes deployment jobs from a Redis queue and manages the entire build lifecycle.

## Architecture

```
Redis Queue (deployment:queue)
    ↓
Build Worker (processes jobs concurrently)
    ├─ Clone Repository (Git Service)
    ├─ Install Dependencies (Build Service)
    ├─ Execute Build (Build Service)
    └─ Upload Artifacts (Storage Service)
    ↓
MinIO (Static Asset Storage)
```

## Features

- ✅ Concurrent build processing with worker pool
- ✅ Git repository cloning with branch support
- ✅ Framework detection (Next.js, React, Vue, etc.)
- ✅ Package manager detection (npm, yarn, pnpm)
- ✅ Build execution with custom commands
- ✅ Asset optimization and caching
- ✅ MinIO artifact upload
- ✅ Deployment status tracking
- ✅ Comprehensive logging
- ✅ Graceful shutdown

## Project Structure

```
apps/build-service/
├── src/
│   ├── index.ts                    # Service entry point
│   ├── workers/
│   │   └── build-worker.ts        # Job processor
│   ├── services/
│   │   ├── git.ts                 # Git operations
│   │   ├── build.ts               # Build execution
│   │   └── storage.ts             # MinIO uploads
│   └── lib/
│       └── logger.ts              # Logging utility
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vercel_clone

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=vercel-deployments

# Build Service
MAX_CONCURRENT_BUILDS=2
BUILD_DIR=/tmp/builds
BUILD_TIMEOUT=1800000
MAX_BUILD_SIZE=536870912

# Domain
ROOT_DOMAIN=vercel-clone.local
API_URL=http://localhost:9000

# Logging
LOG_LEVEL=info
```

## Build Process

### Step-by-Step Flow

1. **Queue Check**: Listen to Redis `deployment:queue`
2. **Clone**: Clone repository from git_repo_url
3. **Detect**: Identify framework and package manager
4. **Install**: Run dependency installation (npm/yarn/pnpm)
5. **Build**: Execute build command
6. **Verify**: Check output directory exists
7. **Optimize**: Optimize and hash assets
8. **Upload**: Upload to MinIO with proper headers
9. **Status**: Update deployment record
10. **Cleanup**: Remove temporary build files

### Build Job Structure

```typescript
{
  deployment_id: string       // Unique deployment ID
  project_id: string          // Project identifier
  git_commit_sha: string      // Commit hash
  git_branch: string          // Branch name
  git_repo_url: string        // Repository URL
}
```

## Services

### Git Service

Handles all Git operations:
- Clone repositories with branch support
- Shallow clones for faster retrieval
- Framework detection from package.json
- Package manager detection (npm/yarn/pnpm)
- Commit information extraction

```typescript
const git = new GitService()
await git.cloneRepository(repoUrl, branch, targetPath)
const framework = await git.detectFramework(repoPath)
const pm = git.detectPackageManager(repoPath)
```

### Build Service

Manages the build process:
- Install dependencies with timeout protection
- Execute custom build commands
- Verify build output
- Optimize assets
- Generate build manifest

```typescript
const build = new BuildService()
await build.installDependencies(projectPath, 'npm')
await build.executeBuild(projectPath, 'npm run build')
await build.verifyBuildOutput(projectPath, 'dist')
```

### Storage Service

Handles artifact storage:
- Upload to MinIO with proper MIME types
- Set cache control headers
- Hash-based file versioning
- Delete old deployments
- Bucket management

```typescript
const storage = new StorageService()
const result = await storage.uploadDeployment(projectId, deploymentId, buildDir)
// result: { fileCount, totalSize }
```

## Deployment Status

Jobs update deployment status at key points:

- `queued` → Initial state
- `building` → Started cloning/building
- `success` → Build and upload completed
- `failed` → Error occurred during build

## Error Handling

The service handles various error scenarios:

- **Clone errors**: Network issues, invalid URLs, auth failures
- **Build errors**: Missing dependencies, build command failures
- **Upload errors**: MinIO connectivity, permission issues
- **Validation errors**: Missing directories, invalid configuration

All errors are:
1. Logged with context
2. Stored in build_logs table
3. Deployment marked as failed
4. Temporary files cleaned up

## Logging

Detailed logging with:
- Timestamps
- Log levels (debug, info, warn, error)
- Contextual data (deployment ID, project ID, paths)
- Build output snippets
- Performance metrics

### Log Levels

- `debug`: Detailed execution flow
- `info`: Key milestones (start, completion)
- `warn`: Non-critical issues
- `error`: Build failures

## Performance

### Optimization Strategies

1. **Shallow Clones**: `--depth 1` for faster cloning
2. **Concurrent Builds**: Worker pool processes multiple jobs
3. **Buffer Limits**: 50-100MB buffers for large builds
4. **Timeouts**: 30 minute build timeout with monitoring
5. **Asset Caching**: Hash-based cache control headers
6. **Cleanup**: Automatic temporary file removal

### Metrics

- Clone time: ~10-30 seconds
- Install time: ~30-120 seconds
- Build time: ~10-300 seconds (framework dependent)
- Upload time: ~5-60 seconds (size dependent)

## Development

### Install Dependencies

```bash
cd apps/build-service
npm install
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

## Testing

### Test Build Job

```bash
# Create deployment in database
curl -X POST http://localhost:9000/api/deployments/projects/PROJECT_ID \
  -H "Authorization: Bearer TOKEN"

# Monitor logs
docker-compose logs -f build-service

# Check deployment status
curl http://localhost:9000/api/deployments/DEPLOYMENT_ID \
  -H "Authorization: Bearer TOKEN"
```

### Manual Queue Test

```bash
# Add job to queue
redis-cli LPUSH deployment:queue '{
  "deployment_id": "test-123",
  "project_id": "project-456",
  "git_commit_sha": "abc123",
  "git_branch": "main",
  "git_repo_url": "https://github.com/user/repo.git"
}'

# Watch build service process it
docker-compose logs -f build-service
```

## Docker

### Build Image

```bash
docker build -t vercel-clone-build-service .
```

### Run Container

```bash
docker run \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://redis:6379" \
  -e MINIO_ENDPOINT="minio" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  vercel-clone-build-service
```

## Scaling

### Horizontal Scaling

To scale build service:

1. **Multiple Workers**: Increase `MAX_CONCURRENT_BUILDS`
2. **Multiple Instances**: Run multiple build service containers
3. **Load Distribution**: Redis queue naturally distributes jobs

### Example: 4 Parallel Builds

```bash
# Start 2 build service instances, each with 2 workers
MAX_CONCURRENT_BUILDS=2 docker-compose up -d build-service

# Add second instance
docker-compose up -d --scale build-service=2
```

## Troubleshooting

### "Repository not found"
- Check git_repo_url is valid and accessible
- Verify Git credentials if private repo
- Check network connectivity

### "Build command failed"
- Verify build_command in project settings
- Check output_directory exists after build
- Review build logs for errors

### "Upload failed"
- Verify MinIO is running and accessible
- Check MinIO credentials
- Ensure bucket exists
- Check disk space

### "Worker stuck"
- Check logs for error messages
- Verify database and Redis connections
- Review job structure in queue
- Check system resources (CPU, memory)

### High Memory Usage
- Reduce `MAX_CONCURRENT_BUILDS`
- Increase build timeouts
- Clean up old deployments
- Monitor node process

## Security

- Git credentials not stored (use SSH keys or tokens)
- MinIO secrets from environment variables
- Database credentials from environment
- Temporary files cleaned after build
- No build logs stored locally (only in database)

## Best Practices

1. **Resource Limits**: Set appropriate build timeouts
2. **Cleanup**: Regular cleanup of old deployments
3. **Monitoring**: Track build success/failure rates
4. **Logging**: Review logs for optimization opportunities
5. **Testing**: Test builds locally before deploying

## Future Enhancements

- [ ] Docker container builds
- [ ] Build caching (node_modules, npm cache)
- [ ] Parallel asset uploads
- [ ] Build metrics and analytics
- [ ] Rollback to previous deployment
- [ ] Build environment variables
- [ ] Custom build containers
- [ ] Build webhook notifications

## Support

For issues or questions:
1. Check logs: `docker-compose logs build-service`
2. Review troubleshooting section above
3. Check deployment status in dashboard
4. Review database build_logs table

---

**Status**: Production ready
**Last Updated**: 2024-11-17
**Version**: 0.1.0

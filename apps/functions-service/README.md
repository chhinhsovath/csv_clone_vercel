# Serverless Functions Service

The serverless functions service enables users to deploy and execute Node.js functions alongside their static sites. Functions are invoked on-demand, have access to context information, and support both synchronous and asynchronous execution.

## Architecture

```
User Request
    ↓
API Gateway (api:9000)
    ├─ Function metadata check
    ├─ Authorization
    └─ Route to Functions Service
    ↓
Functions Service (functions-service:9001)
    ├─ Load function code
    ├─ Create sandbox environment
    ├─ Execute with timeout protection
    └─ Return result
    ↓
Response to user
```

## Features

- ✅ Node.js function execution
- ✅ Sandboxed execution environment
- ✅ Function caching (10-minute TTL)
- ✅ 30-second execution timeout
- ✅ Console output capture (logs)
- ✅ Async/await support
- ✅ Error handling and reporting
- ✅ Invocation metrics tracking
- ✅ Health check endpoint
- ✅ Graceful shutdown

## Project Structure

```
apps/functions-service/
├── src/
│   ├── index.ts                    # Server entry point and routes
│   ├── services/
│   │   ├── function-executor.ts   # Code execution engine
│   │   ├── function-registry.ts   # Function code management
│   │   └── function-router.ts     # Request routing
│   └── lib/
│       ├── logger.ts              # Logging utility
│       └── prisma.ts              # Database client
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

# API Server
API_ENDPOINT=http://api:9000

# Server
FUNCTIONS_PORT=9001

# Logging
LOG_LEVEL=info
```

## Function Format

Functions must export a handler function that receives an event and context:

```javascript
// Simple synchronous function
export async function handler(event) {
  console.log('Function invoked with:', event)
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello World' })
  }
}

// Async function
export async function handler(event, context) {
  const result = await someAsyncOperation()
  return {
    message: 'Processed successfully',
    data: result
  }
}

// Function with context
export async function handler(event, context) {
  console.log('Function:', context.functionName)
  console.log('Project:', context.projectId)
  console.log('Invocation ID:', context.invocationId)

  return event
}
```

### Handler Signature

```typescript
interface Context {
  functionName: string      // Name of the function
  projectId: string         // Associated project ID
  invocationId: string      // Unique invocation identifier
  timestamp: string         // ISO8601 timestamp of invocation
}

type Handler = (event: any, context: Context) => any | Promise<any>
```

## API Endpoints

### Invoke Function

```
POST /api/v1/functions/:projectId/:functionName
Content-Type: application/json

{
  "key": "value",
  "nested": {
    "data": "here"
  }
}

Response (200):
{
  "success": true,
  "result": { ... },
  "duration": 145,
  "logs": [
    "[LOG] Function invoked",
    "[INFO] Processing data"
  ]
}

Response (500):
{
  "error": "Function execution failed",
  "message": "ReferenceError: undefined variable",
  "logs": [...]
}
```

### Get Function Metadata

```
GET /api/v1/functions/:projectId/:functionName

Response (200):
{
  "success": true,
  "function": {
    "id": "fn-123",
    "function_name": "hello",
    "file_path": "api/hello.js",
    "runtime": "node18",
    "is_active": true,
    "invocation_count": 42,
    "created_at": "2024-11-17T10:00:00Z",
    "updated_at": "2024-11-17T10:00:00Z"
  }
}
```

### List Project Functions

```
GET /api/v1/projects/:projectId/functions

Response (200):
{
  "success": true,
  "functions": [
    {
      "id": "fn-123",
      "function_name": "hello",
      "file_path": "api/hello.js",
      "runtime": "node18",
      "is_active": true,
      "invocation_count": 42,
      "created_at": "2024-11-17T10:00:00Z"
    },
    ...
  ],
  "count": 5
}
```

### Enable/Disable Function

```
PATCH /api/v1/functions/:projectId/:functionName
Content-Type: application/json

{
  "is_active": false
}

Response (200):
{
  "success": true,
  "function": { ... }
}
```

### Management Endpoints (via API)

```
POST   /api/functions/projects/:projectId      # Create function
GET    /api/functions/:projectId/:functionName # Get metadata
GET    /api/functions/projects/:projectId      # List functions
PATCH  /api/functions/:projectId/:functionName # Update function
DELETE /api/functions/:projectId/:functionName # Delete function
```

## Services

### FunctionExecutor

Handles code execution in a sandboxed environment.

**Key Methods:**
```typescript
async execute(request: ExecutionRequest): Promise<ExecutionResult>
// Executes function code with timeout protection

async healthCheck(): Promise<boolean>
// Verify executor is operational
```

**Sandbox Features:**
- Isolated global scope
- Console override (captures logs)
- Standard library (JSON, Math, Date, etc.)
- No access to: setTimeout, setInterval, file system, network
- 30-second execution timeout

### FunctionRegistry

Manages function code retrieval and caching.

**Key Methods:**
```typescript
async getFunction(projectId: string, functionName: string): Promise<string>
// Fetch function code from API with caching

async getMetadata(projectId: string, functionName: string): Promise<FunctionMetadata>
// Get function configuration

async registerFunction(...): Promise<boolean>
// Register new function (called by build service)

async updateFunction(...): Promise<boolean>
// Update function code
```

**Caching:**
- TTL: 10 minutes
- Auto-cleanup every 10 minutes
- Cache key: `{projectId}:{functionName}`

### FunctionRouter

Determines if a request should be routed to a function.

**Key Methods:**
```typescript
async resolveRoute(projectId: string, pathSegments: string[]): Promise<RouteInfo>
// Determine if path is a function request

async getProjectFunctions(projectId: string): Promise<Function[]>
// Get all functions for a project
```

## Execution Environment

### Available Globals

```javascript
// Standard objects
JSON, Math, Array, Object, String, Number, Boolean, Date, RegExp, Error

// Context information
context: {
  functionName: string
  projectId: string
  invocationId: string
  timestamp: string
}

// Console (captured in logs)
console.log()
console.error()
console.warn()
console.info()
```

### Restrictions

Functions **cannot**:
- Access the file system
- Make network requests (planned for Phase 9)
- Access process or system information
- Use timers (setTimeout, setInterval)
- Access other functions' data
- Exceed 30-second execution timeout

## Performance

### Latency

- Function code load (cached): ~5-10ms
- Sandbox creation: ~20-30ms
- Code compilation: ~10-20ms
- Typical execution: 50-500ms
- **Total (cached)**: 100-600ms

### Throughput

- Single instance: 10+ concurrent executions
- Vertical scaling: Add workers
- Horizontal scaling: Multiple function service instances

### Concurrency

- Unlimited concurrent invocations (per instance)
- Isolated sandboxes for each execution
- No shared state between executions

## Error Handling

### Execution Errors

```json
{
  "error": "Function execution failed",
  "message": "ReferenceError: undefined is not a function",
  "logs": [
    "[LOG] Starting function",
    "[ERROR] Error at line 42"
  ]
}
```

### Timeout Errors

```json
{
  "error": "Function execution failed",
  "message": "Function execution timeout (30000ms)",
  "logs": [...]
}
```

### Not Found

```json
{
  "error": "Function not found"
}
```

## Logging

All function console output is captured and returned:

```
[LOG] Starting process
[INFO] Processing item 1
[WARN] Slow operation detected
[ERROR] Failed to process item
```

## Development

### Install Dependencies

```bash
cd apps/functions-service
npm install
```

### Run Locally

```bash
npm run dev
```

Server will start on port 9001 with hot-reload.

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/` directory.

### Start

```bash
npm start
```

Runs compiled JavaScript from `dist/`.

## Docker

### Build Image

```bash
docker build -t vercel-clone-functions:latest apps/functions-service
```

### Run Container

```bash
docker run \
  -p 9001:9001 \
  -e DATABASE_URL=postgresql://... \
  -e API_ENDPOINT=http://api:9000 \
  vercel-clone-functions:latest
```

## Testing

### Test Function Invocation

```bash
curl -X POST http://localhost:9001/api/v1/functions/project-123/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

### Test Async Function

```bash
curl -X POST http://localhost:9001/api/v1/functions/project-123/async-handler \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### View Metrics

```bash
curl http://localhost:9001/health

# Response:
{
  "status": "ok",
  "uptime": 3600.5,
  "totalInvocations": 150,
  "successfulInvocations": 148,
  "failedInvocations": 2
}
```

### Monitor Logs

```bash
docker-compose logs -f functions-service

# Look for:
# [FUNCTIONS] [INFO] Function invocation: project-123/hello
# [FUNCTIONS] [INFO] Function succeeded: project-123/hello
```

## Troubleshooting

### "Function not found"

**Cause:** Function doesn't exist or not registered

**Fix:**
1. Verify function exists: `GET /api/functions/projects/:projectId`
2. Check file path in project
3. Ensure build service registered function

### "Function execution timeout"

**Cause:** Function took > 30 seconds to execute

**Fix:**
1. Optimize function code
2. Split into smaller functions
3. Use async operations efficiently

### "Module not found"

**Cause:** Function imports non-standard library

**Fix:**
1. Only use JavaScript built-ins (JSON, Math, etc.)
2. Don't use require() or import for external modules
3. Inline dependencies if needed

### High Invocation Errors

**Cause:** Function code has bugs

**Fix:**
1. Check function logs: `"logs": [...]` in response
2. Review error message
3. Test locally first
4. Check function code via GET endpoint

### Memory Usage Growing

**Cause:** Code cache not cleaning up

**Fix:**
1. Verify cache cleanup is running
2. Check logs for cleanup messages
3. Monitor cache size in debug output

## Security

### Sandbox Isolation

✅ Each invocation gets isolated execution context
✅ No access to process environment
✅ No file system access
✅ No network access
✅ No timer access
✅ Console output sanitized

### Code Safety

✅ Code compiled in strict mode
✅ Runtime error protection
✅ Timeout enforcement
✅ Memory limits (future)
✅ No eval or Function constructor

## Limitations

### Current (Phase 7)

- JavaScript only (no TypeScript transpilation)
- No external module support
- No network access
- No file system access
- 30-second timeout
- No environment variables in function code

### Planned (Phase 9+)

- TypeScript support
- Environment variables
- Network access (controlled)
- Database connections
- Longer timeouts (60+ seconds)
- Custom runtimes (Python, Go, etc.)
- Function layer/dependencies

## Best Practices

### 1. Keep Functions Small

```javascript
// ✅ GOOD: Focused, single responsibility
export async function handler(event) {
  return { processed: true, count: event.items.length }
}

// ❌ BAD: Does too much
export async function handler(event) {
  // Complex business logic, multiple operations...
}
```

### 2. Use Async/Await

```javascript
// ✅ GOOD: Proper async handling
export async function handler(event) {
  const result = await processData(event)
  return result
}

// ❌ BAD: Synchronous when async could help
export function handler(event) {
  return expensiveSync Computation(event)
}
```

### 3. Return Proper Format

```javascript
// ✅ GOOD: Clear response format
export async function handler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' })
  }
}

// ❌ BAD: Returning non-JSON
export async function handler(event) {
  return "Just a string"
}
```

### 4. Handle Errors Gracefully

```javascript
// ✅ GOOD: Proper error handling
export async function handler(event) {
  try {
    const result = await processData(event)
    return { success: true, data: result }
  } catch (error) {
    console.error('Processing failed:', error.message)
    return { success: false, error: error.message }
  }
}

// ❌ BAD: Unhandled errors
export async function handler(event) {
  return processData(event) // Crash on error
}
```

### 5. Use Logging

```javascript
// ✅ GOOD: Helpful debugging
export async function handler(event) {
  console.log('Processing:', event.id)
  const start = Date.now()

  const result = await process(event)

  const duration = Date.now() - start
  console.info(`Completed in ${duration}ms`)

  return result
}
```

## Future Enhancements

- [ ] TypeScript compilation
- [ ] External npm package support
- [ ] Environment variables
- [ ] Network access
- [ ] Database connections
- [ ] Longer execution timeouts
- [ ] Custom runtimes
- [ ] Function versioning
- [ ] Canary deployments
- [ ] Function analytics

## Support

For issues:
1. Check `/health` endpoint
2. Review function logs in response
3. Check `docker-compose logs functions-service`
4. Verify function code via GET endpoint
5. Test with simple function first

---

**Status**: Production ready for Phase 7
**Last Updated**: 2024-11-17
**Version**: 0.1.0

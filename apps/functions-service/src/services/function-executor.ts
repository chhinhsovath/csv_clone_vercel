import { logger } from '../lib/logger'

export interface ExecutionContext {
  functionName: string
  projectId: string
  invocationId: string
  timestamp: string
}

export interface ExecutionRequest {
  functionId: string
  functionName: string
  projectId: string
  code: string
  event: Record<string, any>
  context: ExecutionContext
}

export interface ExecutionResult {
  success: boolean
  output?: any
  error?: string
  duration: number
  logs: string[]
}

export class FunctionExecutor {
  private logs: string[] = []
  private startTime: number = 0

  async initialize() {
    logger.info('Function executor initialized')
  }

  /**
   * Execute a serverless function in a sandboxed environment
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.logs = []
    this.startTime = Date.now()

    try {
      logger.debug(`Executing function: ${request.projectId}/${request.functionName}`)

      // Create isolated execution context
      const sandbox = this.createSandbox(request.context)

      // Execute function with timeout (30 seconds)
      const result = await this.executeWithTimeout(
        request.code,
        request.event,
        sandbox,
        30000
      )

      const duration = Date.now() - this.startTime

      logger.debug(
        `Function execution completed: ${request.projectId}/${request.functionName}`,
        { duration }
      )

      return {
        success: true,
        output: result,
        duration,
        logs: this.logs,
      }
    } catch (error) {
      const duration = Date.now() - this.startTime
      const errorMessage = (error as Error).message

      logger.error(
        `Function execution failed: ${request.projectId}/${request.functionName}`,
        { error: errorMessage, duration }
      )

      return {
        success: false,
        error: errorMessage,
        duration,
        logs: this.logs,
      }
    }
  }

  /**
   * Create a sandbox execution environment
   */
  private createSandbox(context: ExecutionContext) {
    return {
      // Context information
      context: {
        functionName: context.functionName,
        projectId: context.projectId,
        invocationId: context.invocationId,
        timestamp: context.timestamp,
      },
      // Console override to capture logs
      console: {
        log: (...args: any[]) => {
          const message = args.map((a) => this.serialize(a)).join(' ')
          this.logs.push(`[LOG] ${message}`)
        },
        error: (...args: any[]) => {
          const message = args.map((a) => this.serialize(a)).join(' ')
          this.logs.push(`[ERROR] ${message}`)
        },
        warn: (...args: any[]) => {
          const message = args.map((a) => this.serialize(a)).join(' ')
          this.logs.push(`[WARN] ${message}`)
        },
        info: (...args: any[]) => {
          const message = args.map((a) => this.serialize(a)).join(' ')
          this.logs.push(`[INFO] ${message}`)
        },
      },
      // Standard library functions
      JSON,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Error,
      // Timeout protection
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
    }
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout(
    code: string,
    event: Record<string, any>,
    sandbox: Record<string, any>,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`Function execution timeout (${timeout}ms)`)),
        timeout
      )

      try {
        // Create function from code
        // The code should export a handler function or be directly executable
        const handler = this.createHandler(code, sandbox)

        // Execute the handler
        const result = handler(event, sandbox.context)

        // Handle both sync and async results
        if (result instanceof Promise) {
          result
            .then((output) => {
              clearTimeout(timeoutId)
              resolve(output)
            })
            .catch((error) => {
              clearTimeout(timeoutId)
              reject(error)
            })
        } else {
          clearTimeout(timeoutId)
          resolve(result)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  /**
   * Create a handler function from code
   */
  private createHandler(
    code: string,
    sandbox: Record<string, any>
  ): (event: any, context: any) => any {
    try {
      // Support both CommonJS and ES6 module style
      // Try to detect the export style

      // Create wrapper that injects sandbox
      const sandboxVars = Object.keys(sandbox)
        .map((key) => `const ${key} = this.${key}`)
        .join(';')

      const wrappedCode = `
        return (function() {
          ${sandboxVars};

          // User code
          ${code}

          // If handler is exported, use it; otherwise return the result
          if (typeof handler === 'function') {
            return handler;
          } else if (typeof exports === 'object' && exports.handler) {
            return exports.handler;
          } else {
            // If code directly returns something, wrap it
            return function(event, context) {
              return undefined;
            };
          }
        })()
      `

      const handlerFactory = new Function(wrappedCode)
      const handler = handlerFactory.call(sandbox)

      if (typeof handler !== 'function') {
        throw new Error('Function must export a handler function')
      }

      return handler
    } catch (error) {
      logger.error(`Failed to create handler: ${(error as Error).message}`)
      throw new Error(`Invalid function code: ${(error as Error).message}`)
    }
  }

  /**
   * Serialize values for logging
   */
  private serialize(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value)
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return Object.prototype.toString.call(value)
      }
    }
    return String(value)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test simple function execution
      const result = await this.execute({
        functionId: 'health-check',
        functionName: 'health-check',
        projectId: 'system',
        code: 'function handler(event) { return { ok: true }; }',
        event: {},
        context: {
          functionName: 'health-check',
          projectId: 'system',
          invocationId: 'health-check',
          timestamp: new Date().toISOString(),
        },
      })

      return result.success
    } catch {
      return false
    }
  }
}

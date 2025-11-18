import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export class BuildService {
  /**
   * Install dependencies using detected package manager
   */
  async installDependencies(
    projectPath: string,
    packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'
  ): Promise<void> {
    try {
      logger.info('Installing dependencies', {
        path: projectPath,
        packageManager,
      })

      const installCommand = {
        npm: 'npm ci --prefer-offline --no-audit',
        yarn: 'yarn install --frozen-lockfile',
        pnpm: 'pnpm install --frozen-lockfile',
      }[packageManager]

      const { stdout, stderr } = await execAsync(installCommand, {
        cwd: projectPath,
        timeout: 600000, // 10 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      })

      logger.info('Dependencies installed successfully', {
        path: projectPath,
        output: stdout.split('\n').slice(-3).join('\n'),
      })
    } catch (error: any) {
      logger.error('Failed to install dependencies', {
        error: error.message,
        path: projectPath,
      })
      throw new Error(`Failed to install dependencies: ${error.message}`)
    }
  }

  /**
   * Execute build command
   */
  async executeBuild(projectPath: string, buildCommand: string): Promise<void> {
    try {
      logger.info('Executing build command', {
        path: projectPath,
        command: buildCommand,
      })

      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: projectPath,
        timeout: 1800000, // 30 minutes
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      })

      logger.info('Build completed successfully', {
        path: projectPath,
        output: stdout.split('\n').slice(-5).join('\n'),
      })

      if (stderr && !stderr.includes('npm WARN')) {
        logger.warn('Build warnings', { stderr })
      }
    } catch (error: any) {
      logger.error('Build failed', {
        error: error.message,
        path: projectPath,
      })
      throw new Error(`Build failed: ${error.message}`)
    }
  }

  /**
   * Verify build output exists
   */
  async verifyBuildOutput(projectPath: string, outputDir: string): Promise<boolean> {
    const fullPath = path.join(projectPath, outputDir)

    if (!fs.existsSync(fullPath)) {
      logger.error('Build output directory not found', { path: fullPath })
      return false
    }

    const files = fs.readdirSync(fullPath)
    if (files.length === 0) {
      logger.error('Build output directory is empty', { path: fullPath })
      return false
    }

    logger.info('Build output verified', {
      path: fullPath,
      fileCount: files.length,
    })

    return true
  }

  /**
   * Optimize built assets
   */
  async optimizeAssets(outputPath: string): Promise<{
    optimizedFiles: number
    originalSize: number
    optimizedSize: number
  }> {
    try {
      let originalSize = 0
      let optimizedSize = 0
      let optimizedFiles = 0

      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir)

        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)

          if (stat.isDirectory()) {
            walkDir(filePath)
          } else if (
            file.endsWith('.js') ||
            file.endsWith('.css') ||
            file.endsWith('.html')
          ) {
            const size = stat.size
            originalSize += size

            // In production, would use actual minification
            // For now, just calculate as-is
            optimizedSize += size
            optimizedFiles++
          }
        }
      }

      walkDir(outputPath)

      logger.info('Assets optimization completed', {
        optimizedFiles,
        originalSize,
        optimizedSize,
        reduction: `${Math.round(((originalSize - optimizedSize) / originalSize) * 100)}%`,
      })

      return {
        optimizedFiles,
        originalSize,
        optimizedSize,
      }
    } catch (error: any) {
      logger.warn('Failed to optimize assets', { error: error.message })
      return {
        optimizedFiles: 0,
        originalSize: 0,
        optimizedSize: 0,
      }
    }
  }

  /**
   * Generate build manifest
   */
  async generateBuildManifest(
    outputPath: string
  ): Promise<Record<string, string>> {
    try {
      const manifest: Record<string, string> = {}

      const walkDir = (dir: string, prefix = '') => {
        const files = fs.readdirSync(dir)

        for (const file of files) {
          const filePath = path.join(dir, file)
          const relativePath = prefix ? `${prefix}/${file}` : file
          const stat = fs.statSync(filePath)

          if (stat.isDirectory()) {
            walkDir(filePath, relativePath)
          } else {
            const hash = require('crypto')
              .createHash('md5')
              .update(fs.readFileSync(filePath))
              .digest('hex')
              .substring(0, 8)

            manifest[relativePath] = hash
          }
        }
      }

      walkDir(outputPath)

      logger.info('Build manifest generated', {
        files: Object.keys(manifest).length,
      })

      return manifest
    } catch (error: any) {
      logger.warn('Failed to generate build manifest', { error: error.message })
      return {}
    }
  }
}

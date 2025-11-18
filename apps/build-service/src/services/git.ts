import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export class GitService {
  /**
   * Clone a Git repository
   */
  async cloneRepository(
    repoUrl: string,
    branch: string,
    targetPath: string
  ): Promise<string> {
    try {
      // Ensure parent directory exists
      const parentDir = path.dirname(targetPath)
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }

      // Clone the repository
      logger.info('Cloning repository', {
        repo: repoUrl,
        branch,
        path: targetPath,
      })

      const { stdout, stderr } = await execAsync(
        `git clone --branch ${branch} --depth 1 --single-branch ${repoUrl} ${targetPath}`,
        {
          timeout: 300000, // 5 minutes
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      )

      if (stderr && !stderr.includes('Cloning into')) {
        logger.warn('Git clone warning', { stderr })
      }

      logger.info('Repository cloned successfully', { path: targetPath })

      return targetPath
    } catch (error: any) {
      logger.error('Failed to clone repository', {
        error: error.message,
        repo: repoUrl,
      })
      throw new Error(`Failed to clone repository: ${error.message}`)
    }
  }

  /**
   * Get commit information
   */
  async getCommitInfo(repoPath: string): Promise<{
    sha: string
    message: string
    author: string
    date: string
  }> {
    try {
      const { stdout: sha } = await execAsync('git rev-parse HEAD', {
        cwd: repoPath,
      })
      const { stdout: message } = await execAsync('git log -1 --pretty=%B', {
        cwd: repoPath,
      })
      const { stdout: author } = await execAsync('git log -1 --pretty=%an', {
        cwd: repoPath,
      })
      const { stdout: date } = await execAsync('git log -1 --pretty=%ai', {
        cwd: repoPath,
      })

      return {
        sha: sha.trim(),
        message: message.trim(),
        author: author.trim(),
        date: date.trim(),
      }
    } catch (error: any) {
      logger.error('Failed to get commit info', { error: error.message })
      throw error
    }
  }

  /**
   * Detect package manager (npm, yarn, pnpm)
   */
  detectPackageManager(repoPath: string): 'npm' | 'yarn' | 'pnpm' {
    if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
      return 'yarn'
    } else if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
      return 'pnpm'
    }
    // Default to npm
    return 'npm'
  }

  /**
   * Detect framework from package.json
   */
  async detectFramework(repoPath: string): Promise<string | null> {
    try {
      const packageJsonPath = path.join(repoPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        return null
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      if (dependencies['next']) return 'next'
      if (dependencies['react']) return 'react'
      if (dependencies['vue']) return 'vue'
      if (dependencies['svelte']) return 'svelte'
      if (dependencies['gatsby']) return 'gatsby'
      if (dependencies['nuxt']) return 'nuxt'

      return null
    } catch (error: any) {
      logger.warn('Failed to detect framework', { error: error.message })
      return null
    }
  }
}

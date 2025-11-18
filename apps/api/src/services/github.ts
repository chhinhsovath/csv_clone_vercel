import axios from 'axios'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

export interface GitHubUser {
  id: number
  login: string
  name: string
  avatar_url: string
  email?: string
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  url: string
  html_url: string
  private: boolean
  owner: {
    login: string
    avatar_url: string
  }
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
}

export class GitHubService {
  private clientId: string
  private clientSecret: string

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || ''
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || ''

    if (!this.clientId || !this.clientSecret) {
      logger.warn('GitHub OAuth credentials not configured')
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback'

    return `${GITHUB_OAUTH_URL}?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user:email&state=${state}`
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post(
        GITHUB_TOKEN_URL,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (response.data.error) {
        throw new Error(response.data.error_description || 'Failed to exchange code for token')
      }

      return response.data.access_token
    } catch (error: any) {
      logger.error('Failed to exchange GitHub code for token', {
        error: error.message,
        code: code.substring(0, 10) + '...',
      })
      throw error
    }
  }

  /**
   * Get authenticated GitHub user
   */
  async getUser(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      return response.data
    } catch (error: any) {
      logger.error('Failed to fetch GitHub user', {
        error: error.message,
      })
      throw error
    }
  }

  /**
   * List repositories for authenticated user
   */
  async listRepositories(accessToken: string, page: number = 1, perPage: number = 20) {
    try {
      const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          page,
          per_page: perPage,
          sort: 'updated',
          direction: 'desc',
        },
      })

      return {
        repositories: response.data as GitHubRepository[],
        hasMore: response.headers['link']?.includes('rel="next"') || false,
      }
    } catch (error: any) {
      logger.error('Failed to list GitHub repositories', {
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Get branches for a repository
   */
  async getBranches(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<GitHubBranch[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/branches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return response.data
    } catch (error: any) {
      logger.error('Failed to fetch GitHub branches', {
        error: error.message,
        owner,
        repo,
      })
      throw error
    }
  }

  /**
   * Create a webhook on GitHub repository
   */
  async createWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    webhookUrl: string,
    secret: string
  ): Promise<{ id: number; url: string }> {
    try {
      const response = await axios.post(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: secret,
            insecure_ssl: '0',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return {
        id: response.data.id,
        url: response.data.config.url,
      }
    } catch (error: any) {
      logger.error('Failed to create GitHub webhook', {
        error: error.message,
        owner,
        repo,
      })
      throw error
    }
  }

  /**
   * Delete a webhook from GitHub repository
   */
  async deleteWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    hookId: number
  ): Promise<boolean> {
    try {
      await axios.delete(
        `${GITHUB_API_URL}/repos/${owner}/${repo}/hooks/${hookId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return true
    } catch (error: any) {
      logger.error('Failed to delete GitHub webhook', {
        error: error.message,
        owner,
        repo,
        hookId,
      })
      throw error
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const digest = 'sha256=' + hmac.digest('hex')
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  }

  /**
   * Save GitHub token for user
   */
  async saveGitToken(
    userId: string,
    accessToken: string,
    user: GitHubUser
  ): Promise<void> {
    try {
      // Update or create Git token
      await prisma.gitToken.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          provider: 'github',
          access_token: accessToken,
          provider_user_id: user.id.toString(),
          provider_username: user.login,
        },
        update: {
          access_token: accessToken,
          provider_user_id: user.id.toString(),
          provider_username: user.login,
        },
      })

      logger.info('GitHub token saved for user', {
        userId,
        username: user.login,
      })
    } catch (error: any) {
      logger.error('Failed to save GitHub token', {
        error: error.message,
        userId,
      })
      throw error
    }
  }

  /**
   * Get stored GitHub token for user
   */
  async getGitToken(userId: string): Promise<string | null> {
    try {
      const token = await prisma.gitToken.findUnique({
        where: { user_id: userId },
      })

      return token?.access_token || null
    } catch (error: any) {
      logger.error('Failed to get GitHub token', {
        error: error.message,
        userId,
      })
      return null
    }
  }

  /**
   * Delete stored GitHub token
   */
  async deleteGitToken(userId: string): Promise<void> {
    try {
      await prisma.gitToken.delete({
        where: { user_id: userId },
      })

      logger.info('GitHub token deleted for user', { userId })
    } catch (error: any) {
      logger.error('Failed to delete GitHub token', {
        error: error.message,
        userId,
      })
    }
  }
}

// Create singleton instance
export const githubService = new GitHubService()

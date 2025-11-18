import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to requests if available
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    // Handle responses
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, clear it
          this.setToken(null)
          // Redirect to login (handled by middleware)
        }
        throw error
      }
    )

    // Load token from localStorage on init
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  // Auth endpoints
  async register(email: string, password: string, name?: string) {
    const response = await this.client.post<
      ApiResponse<{ user: any; token: string }>
    >('/api/auth/register', {
      email,
      password,
      name,
    })
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return response.data
  }

  async login(email: string, password: string) {
    const response = await this.client.post<
      ApiResponse<{ user: any; token: string }>
    >('/api/auth/login', {
      email,
      password,
    })
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return response.data
  }

  async getCurrentUser() {
    const response = await this.client.get<ApiResponse<{ user: any }>>(
      '/api/auth/me'
    )
    return response.data
  }

  async refreshToken() {
    const response = await this.client.post<ApiResponse<{ token: string }>>(
      '/api/auth/refresh'
    )
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return response.data
  }

  logout() {
    this.setToken(null)
  }

  // Project endpoints
  async getProjects() {
    const response = await this.client.get<ApiResponse<{ projects: any[] }>>(
      '/api/projects'
    )
    return response.data
  }

  async getProject(id: string) {
    const response = await this.client.get<ApiResponse<{ project: any }>>(
      `/api/projects/${id}`
    )
    return response.data
  }

  async createProject(data: {
    name: string
    description?: string
    git_repo_url: string
    git_branch?: string
    build_command?: string
    output_directory?: string
  }) {
    const response = await this.client.post<ApiResponse<{ project: any }>>(
      '/api/projects',
      data
    )
    return response.data
  }

  async updateProject(
    id: string,
    data: {
      name?: string
      description?: string
      git_branch?: string
      build_command?: string
      output_directory?: string
    }
  ) {
    const response = await this.client.patch<ApiResponse<{ project: any }>>(
      `/api/projects/${id}`,
      data
    )
    return response.data
  }

  async deleteProject(id: string) {
    const response = await this.client.delete<ApiResponse<{ message: string }>>(
      `/api/projects/${id}`
    )
    return response.data
  }

  // Deployment endpoints (placeholders for now)
  async getDeployments(projectId: string) {
    // To be implemented
    return { deployments: [] }
  }

  async triggerDeployment(projectId: string, branch?: string) {
    // To be implemented
    return { deployment: {} }
  }

  // Domain endpoints (placeholders for now)
  async getDomains(projectId: string) {
    // To be implemented
    return { domains: [] }
  }

  // Environment endpoints (placeholders for now)
  async getEnvironmentVariables(projectId: string) {
    // To be implemented
    return { variables: [] }
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

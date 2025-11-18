// User types
export interface User {
  id: string
  email: string
  name?: string
  created_at: string
}

// Project types
export interface Project {
  id: string
  user_id?: string
  team_id?: string
  name: string
  description?: string
  git_repo_url: string
  git_branch: string
  build_command: string
  output_directory: string
  framework?: string
  created_at: string
  updated_at: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  git_repo_url: string
  git_branch?: string
  build_command?: string
  output_directory?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  git_branch?: string
  build_command?: string
  output_directory?: string
}

// Deployment types
export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'success' | 'failed'

export interface Deployment {
  id: string
  project_id: string
  git_commit_sha: string
  git_commit_msg?: string
  git_branch: string
  git_author?: string
  status: DeploymentStatus
  deployment_url?: string
  build_start_at?: string
  build_end_at?: string
  file_count: number
  build_size: number
  created_at: string
  updated_at: string
}

// Domain types
export interface Domain {
  id: string
  project_id: string
  domain_name: string
  is_verified: boolean
  ssl_status: 'pending' | 'active' | 'failed' | 'renewing'
  dns_cname_target?: string
  ssl_cert_path?: string
  ssl_key_path?: string
  ssl_expires_at?: string
  created_at: string
  updated_at: string
}

// Environment variable types
export interface EnvironmentVariable {
  id: string
  project_id: string
  key: string
  value: string
  is_build_time: boolean
  is_encrypted: boolean
  created_at: string
  updated_at: string
}

export interface CreateEnvVarInput {
  key: string
  value: string
  is_build_time?: boolean
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: {
    message: string
    code: string
    statusCode: number
  }
}

export interface ApiListResponse<T> {
  data: T[]
  total?: number
  page?: number
  limit?: number
}

// Auth state
export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
}

// UI state
export interface LoadingState {
  isLoading: boolean
  error: string | null
  success: boolean
}

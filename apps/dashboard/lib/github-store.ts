import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface GitHubInfo {
  connected: boolean
  provider: string | null
  username: string | null
  connected_at: string | null
}

interface GitHubStore {
  info: GitHubInfo | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchGitHubInfo: () => Promise<void>
  getAuthorizationUrl: () => Promise<{ url: string; state: string }>
  disconnect: () => Promise<void>
  clearError: () => void
}

export const useGitHubStore = create<GitHubStore>((set) => ({
  info: null,
  isLoading: false,
  error: null,

  fetchGitHubInfo: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.client.get<{ data: GitHubInfo }>('/api/auth/github/info')
      if (response.data) {
        set({ info: response.data as GitHubInfo, isLoading: false })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch GitHub info'
      set({ error: errorMessage, isLoading: false })
    }
  },

  getAuthorizationUrl: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.client.get<{ url: string; state: string }>(
        '/api/auth/github/authorize'
      )
      set({ isLoading: false })
      return response.data
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to get authorization URL'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  disconnect: async () => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.client.post('/api/auth/github/disconnect')
      await set({ info: null, isLoading: false })
      // Refetch info
      const response = await apiClient.client.get<{ data: GitHubInfo }>('/api/auth/github/info')
      if (response.data) {
        set({ info: response.data as GitHubInfo })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to disconnect GitHub'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))

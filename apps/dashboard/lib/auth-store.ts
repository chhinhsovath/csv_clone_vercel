import { create } from 'zustand'
import type { User, AuthState } from '@/types'
import { apiClient } from '@/lib/api-client'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  refreshToken: () => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setUser: (user: User | null) => set({ user }),

  setToken: (token: string | null) => {
    set({ token })
    if (token) {
      apiClient.setToken(token)
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.login(email, password)
      if (response.token && response.user) {
        set({
          user: response.user,
          token: response.token,
          isLoading: false,
          error: null,
        })
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Login failed'
      set({
        isLoading: false,
        error: errorMessage,
        user: null,
        token: null,
      })
      throw error
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.register(email, password, name)
      if (response.token && response.user) {
        set({
          user: response.user,
          token: response.token,
          isLoading: false,
          error: null,
        })
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Registration failed'
      set({
        isLoading: false,
        error: errorMessage,
        user: null,
        token: null,
      })
      throw error
    }
  },

  logout: () => {
    apiClient.logout()
    set({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    })
  },

  loadUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ user: null, token: null })
      return
    }

    set({ isLoading: true })
    try {
      apiClient.setToken(token)
      const response = await apiClient.getCurrentUser()
      if (response.user) {
        set({
          user: response.user,
          token: token,
          isLoading: false,
          error: null,
        })
      }
    } catch (error) {
      set({
        user: null,
        token: null,
        isLoading: false,
      })
    }
  },

  refreshToken: async () => {
    try {
      const response = await apiClient.refreshToken()
      if (response.token) {
        set({ token: response.token })
      }
    } catch (error) {
      set({
        user: null,
        token: null,
        error: 'Token refresh failed',
      })
    }
  },
}))

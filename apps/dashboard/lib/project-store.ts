import { create } from 'zustand'
import type { Project } from '@/types'
import { apiClient } from '@/lib/api-client'

interface ProjectStore {
  projects: Project[]
  selectedProject: Project | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: any) => Promise<Project>
  updateProject: (id: string, data: any) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  selectProject: (project: Project | null) => void
  clearError: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.getProjects()
      if (response.projects) {
        set({ projects: response.projects, isLoading: false })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch projects'
      set({ error: errorMessage, isLoading: false })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.getProject(id)
      if (response.project) {
        set({ selectedProject: response.project, isLoading: false })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch project'
      set({ error: errorMessage, isLoading: false })
    }
  },

  createProject: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.createProject(data)
      if (response.project) {
        const { projects } = get()
        set({
          projects: [...projects, response.project],
          isLoading: false
        })
        return response.project
      }
      throw new Error('No project in response')
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create project'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  updateProject: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.updateProject(id, data)
      if (response.project) {
        const { projects, selectedProject } = get()
        set({
          projects: projects.map(p => p.id === id ? response.project : p),
          selectedProject: selectedProject?.id === id ? response.project : selectedProject,
          isLoading: false
        })
        return response.project
      }
      throw new Error('No project in response')
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update project'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.deleteProject(id)
      const { projects, selectedProject } = get()
      set({
        projects: projects.filter(p => p.id !== id),
        selectedProject: selectedProject?.id === id ? null : selectedProject,
        isLoading: false
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete project'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  selectProject: (project: Project | null) => {
    set({ selectedProject: project })
  },

  clearError: () => {
    set({ error: null })
  },
}))

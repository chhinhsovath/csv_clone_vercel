'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectStore } from '@/lib/project-store'
import { Plus, GitBranch, Calendar, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const { projects, fetchProjects, isLoading, error } = useProjectStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      fetchProjects()
      setIsInitialized(true)
    }
  }, [isInitialized, fetchProjects])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600 mt-1">
            Manage and deploy your applications
          </p>
        </div>
        <Link
          href="/dashboard/projects/create"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects.length === 0 && (
        <div className="card p-12 text-center">
          <div className="mb-4">
            <GitBranch className="w-12 h-12 text-slate-300 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No projects yet
          </h3>
          <p className="text-slate-600 mb-6">
            Create your first project to get started with deployments
          </p>
          <Link
            href="/dashboard/projects/create"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Link>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded mb-4"></div>
              <div className="h-4 bg-slate-200 rounded mb-4 w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="card-hover p-6 group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 group-hover:text-brand-500 transition-colors line-clamp-1">
              {project.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {project.description || 'No description'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors flex-shrink-0 ml-2" />
        </div>

        <div className="space-y-2 mb-4">
          {/* Framework Badge */}
          {project.framework && (
            <div className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
              {project.framework}
            </div>
          )}

          {/* Git Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GitBranch className="w-3 h-3" />
            <span className="font-mono">{project.git_branch}</span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(project.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Build Command */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">Build command</p>
          <p className="text-xs font-mono text-slate-700 mt-1">
            {project.build_command}
          </p>
        </div>
      </div>
    </Link>
  )
}

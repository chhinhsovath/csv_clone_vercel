'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/project-store'
import { ArrowLeft, ExternalLink, Calendar, GitBranch, Code } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { selectedProject, fetchProject, isLoading, error } = useProjectStore()
  const projectId = params.id as string
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized && projectId) {
      fetchProject(projectId)
      setIsInitialized(true)
    }
  }, [isInitialized, projectId, fetchProject])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full"></div>
        </div>
      </div>
    )
  }

  if (error || !selectedProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>
        <div className="card p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {selectedProject.name}
            </h1>
            {selectedProject.description && (
              <p className="text-slate-600 mt-1">{selectedProject.description}</p>
            )}
          </div>
          <Link
            href={`/dashboard/projects/${selectedProject.id}/settings`}
            className="inline-block px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors text-sm font-medium"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Git Repository */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Repository</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">URL</p>
              <p className="text-sm font-mono text-slate-700 break-all">
                {selectedProject.git_repo_url}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <GitBranch className="w-3 h-3" /> Branch
              </p>
              <p className="text-sm font-mono text-slate-700">
                {selectedProject.git_branch}
              </p>
            </div>
          </div>
        </div>

        {/* Build Configuration */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Build Configuration</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Build Command</p>
              <p className="text-sm font-mono text-slate-700">
                {selectedProject.build_command}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Output Directory</p>
              <p className="text-sm font-mono text-slate-700">
                {selectedProject.output_directory}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployments Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Deployments</h2>
          <button className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm">
            Deploy Now
          </button>
        </div>

        {/* Empty Deployments */}
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">No deployments yet</p>
          <p className="text-sm text-slate-500">
            Create your first deployment to get started
          </p>
        </div>
      </div>

      {/* Domains Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Domains</h2>
          <Link
            href={`/dashboard/projects/${selectedProject.id}/domains`}
            className="text-brand-500 hover:text-brand-600 text-sm font-medium"
          >
            Manage Domains
          </Link>
        </div>

        {/* Empty Domains */}
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">No custom domains configured</p>
          <p className="text-sm text-slate-500 mb-4">
            Add a custom domain to deploy your project to your own URL
          </p>
          <Link
            href={`/dashboard/projects/${selectedProject.id}/domains`}
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Add Domain
          </Link>
        </div>
      </div>

      {/* Environment Variables Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Environment Variables</h2>
          <Link
            href={`/dashboard/projects/${selectedProject.id}/env`}
            className="text-brand-500 hover:text-brand-600 text-sm font-medium"
          >
            Manage
          </Link>
        </div>

        {/* Empty Env Vars */}
        <div className="text-center py-12">
          <Code className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No environment variables configured</p>
          <Link
            href={`/dashboard/projects/${selectedProject.id}/env`}
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Add Variables
          </Link>
        </div>
      </div>

      {/* Project Metadata */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Project ID</p>
            <p className="font-mono text-slate-700">{selectedProject.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-slate-500">Created</p>
              <p className="text-slate-700">
                {formatDistanceToNow(new Date(selectedProject.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

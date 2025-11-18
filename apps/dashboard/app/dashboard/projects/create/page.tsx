'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/lib/project-store'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const FRAMEWORKS = [
  { value: 'next', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'static', label: 'Static HTML' },
]

export default function CreateProjectPage() {
  const router = useRouter()
  const { createProject, isLoading, error } = useProjectStore()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    git_repo_url: '',
    git_branch: 'main',
    build_command: 'npm run build',
    output_directory: 'dist',
    framework: 'next',
  })
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    // Validation
    if (!formData.name || !formData.git_repo_url) {
      setSubmitError('Project name and Git repository URL are required')
      return
    }

    try {
      const newProject = await createProject(formData)
      router.push(`/dashboard/projects/${newProject.id}`)
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || 'Failed to create project')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Create New Project</h1>
        <p className="text-slate-600 mt-2">
          Deploy your application from a Git repository
        </p>
      </div>

      {/* Form Card */}
      <div className="card p-8">
        {/* Error Message */}
        {(submitError || error) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {submitError || error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="My Awesome App"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              placeholder="A brief description of your project"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
              rows={3}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Git Repository URL */}
          <div>
            <label htmlFor="git_repo_url" className="block text-sm font-medium text-slate-700 mb-2">
              Git Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              id="git_repo_url"
              type="url"
              placeholder="https://github.com/username/repo.git"
              value={formData.git_repo_url}
              onChange={(e) =>
                setFormData({ ...formData, git_repo_url: e.target.value })
              }
              disabled={isLoading}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Use HTTPS URL for public repos
            </p>
          </div>

          {/* Git Branch */}
          <div>
            <label htmlFor="git_branch" className="block text-sm font-medium text-slate-700 mb-2">
              Branch
            </label>
            <input
              id="git_branch"
              type="text"
              placeholder="main"
              value={formData.git_branch}
              onChange={(e) =>
                setFormData({ ...formData, git_branch: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          {/* Framework */}
          <div>
            <label htmlFor="framework" className="block text-sm font-medium text-slate-700 mb-2">
              Framework
            </label>
            <select
              id="framework"
              value={formData.framework}
              onChange={(e) =>
                setFormData({ ...formData, framework: e.target.value })
              }
              disabled={isLoading}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Auto-detect</option>
              {FRAMEWORKS.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label}
                </option>
              ))}
            </select>
          </div>

          {/* Build Command */}
          <div>
            <label htmlFor="build_command" className="block text-sm font-medium text-slate-700 mb-2">
              Build Command
            </label>
            <input
              id="build_command"
              type="text"
              placeholder="npm run build"
              value={formData.build_command}
              onChange={(e) =>
                setFormData({ ...formData, build_command: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          {/* Output Directory */}
          <div>
            <label htmlFor="output_directory" className="block text-sm font-medium text-slate-700 mb-2">
              Output Directory
            </label>
            <input
              id="output_directory"
              type="text"
              placeholder="dist"
              value={formData.output_directory}
              onChange={(e) =>
                setFormData({ ...formData, output_directory: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-1">
              Where your built files are located
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Your repository will be cloned and analyzed</li>
          <li>The build process will run automatically</li>
          <li>Your app will be deployed to a preview URL</li>
          <li>You can add a custom domain later</li>
        </ul>
      </div>
    </div>
  )
}

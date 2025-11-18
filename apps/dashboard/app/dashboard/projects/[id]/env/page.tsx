'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'

export default function EnvironmentVariablesPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/dashboard/projects/${projectId}`} className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to project
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Environment Variables</h1>
        <button className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
          <Plus className="w-5 h-5" />
          Add Variable
        </button>
      </div>

      {/* Coming Soon */}
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Environment Variables Coming Soon
        </h2>
        <p className="text-slate-600 mb-6">
          Manage build-time and runtime environment variables for your project
        </p>
      </div>
    </div>
  )
}

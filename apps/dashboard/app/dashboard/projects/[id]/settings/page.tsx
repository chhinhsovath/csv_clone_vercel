'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ProjectSettingsPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/dashboard/projects/${projectId}`} className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to project
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 mb-8">Project Settings</h1>

      {/* Coming Soon */}
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Project Settings Coming Soon
        </h2>
        <p className="text-slate-600 mb-6">
          Edit project configuration, build settings, and more coming in the next phase
        </p>
      </div>
    </div>
  )
}

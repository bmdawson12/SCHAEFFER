import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { citationsApi } from '../api/client'
import type { Citation } from '../types'
import { format } from 'date-fns'

const FIELD_LABELS: { key: keyof Citation; label: string }[] = [
  { key: 'short_research_tag', label: 'Short Research Tag' },
  { key: 'citation_type', label: 'Type' },
  { key: 'title_of_paper', label: 'Title of Paper' },
  { key: 'publication_cited', label: 'Publication Cited' },
  { key: 'year_of_publication_cited', label: 'Year of Publication Cited' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'cited_in', label: 'Cited In' },
  { key: 'year_of_government_publication', label: 'Year of Government Publication' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'link', label: 'Link' },
  { key: 'policy_area', label: 'Policy Area' },
  { key: 'notes', label: 'Notes' },
]

export default function CitationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [citation, setCitation] = useState<Citation | null>(null)
  const [editing, setEditing] = useState<Partial<Citation>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    citationsApi
      .get(Number(id))
      .then(r => setCitation(r.data))
      .catch(() => toast.error('Citation not found'))
      .finally(() => setLoading(false))
  }, [id])

  function startEdit() {
    setEditing({ ...citation })
    setIsEditing(true)
  }

  async function saveEdit() {
    try {
      const r = await citationsApi.update(Number(id), editing)
      setCitation(r.data)
      setIsEditing(false)
      toast.success('Citation updated')
    } catch {
      toast.error('Failed to save')
    }
  }

  async function deleteCitation() {
    if (!confirm('Delete this citation?')) return
    await citationsApi.delete(Number(id))
    toast.success('Deleted')
    navigate('/citations')
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )

  if (!citation) return <p className="text-gray-500">Citation not found.</p>

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/citations" className="text-sm text-blue-600 hover:underline">
            ← Citations
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Citation #{citation.id}</h1>
          {citation.is_auto_detected && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Auto-detected
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="text-sm px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50">
                Edit
              </button>
              <button onClick={deleteCitation} className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
        {FIELD_LABELS.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-3 gap-4 px-5 py-3">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="col-span-2 text-sm text-gray-900">
              {isEditing ? (
                key === 'link' ? (
                  <input
                    type="url"
                    value={(editing[key] as string) ?? ''}
                    onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                ) : key === 'notes' || key === 'title_of_paper' || key === 'cited_in' ? (
                  <textarea
                    value={(editing[key] as string) ?? ''}
                    onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <input
                    type={
                      key === 'year_of_publication_cited' || key === 'year_of_government_publication'
                        ? 'number'
                        : 'text'
                    }
                    value={(editing[key] as string | number) ?? ''}
                    onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                )
              ) : key === 'link' && citation[key] ? (
                <a
                  href={citation[key] as string}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {citation[key] as string}
                </a>
              ) : (
                (citation[key] as string | number | null) ?? <span className="text-gray-300">—</span>
              )}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-4 px-5 py-3">
          <dt className="text-sm font-medium text-gray-500">Created</dt>
          <dd className="col-span-2 text-sm text-gray-900">
            {format(new Date(citation.created_at), 'PPP p')}
          </dd>
        </div>
      </div>
    </div>
  )
}

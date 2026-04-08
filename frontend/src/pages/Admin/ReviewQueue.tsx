import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { reviewQueueApi } from '../../api/client'
import type { ReviewQueueItem, PaginatedResponse } from '../../types'
import { format } from 'date-fns'

const CITATION_TYPES = [
  'Journal Article', 'Working Paper', 'Report', 'Book', 'Book Chapter',
  'Policy Brief', 'Testimony', 'White Paper', 'Conference Paper', 'Other',
]
const POLICY_AREAS = [
  'Health Care', 'Tax Policy', 'Drug Pricing', 'Medicare', 'Medicaid',
  'Social Security', 'Housing', 'Education', 'Climate / Energy',
  'Financial Regulation', 'Labor', 'Trade', 'Budget / Fiscal',
  'Prescription Drugs', 'Insurance', 'Other',
]

function Badge({ score }: { score?: number }) {
  if (score == null) return null
  const color = score >= 95 ? 'bg-green-100 text-green-700' : score >= 88 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{score.toFixed(0)}%</span>
}

export default function ReviewQueue() {
  const [data, setData] = useState<PaginatedResponse<ReviewQueueItem> | null>(null)
  const [selected, setSelected] = useState<ReviewQueueItem | null>(null)
  const [edits, setEdits] = useState<Partial<ReviewQueueItem>>({})
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  function load(p = page, sf = statusFilter) {
    setLoading(true)
    reviewQueueApi
      .list({ status: sf, page: p, page_size: 25 })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function select(item: ReviewQueueItem) {
    setSelected(item)
    setEdits({ ...item })
  }

  function setEdit(key: string, value: string | number) {
    setEdits(e => ({ ...e, [key]: value }))
  }

  async function saveEdits() {
    if (!selected) return
    try {
      const r = await reviewQueueApi.update(selected.id, edits)
      setSelected(r.data)
      setEdits(r.data)
      toast.success('Saved')
      load()
    } catch {
      toast.error('Failed to save')
    }
  }

  async function approve() {
    if (!selected) return
    // Save edits first
    try {
      await reviewQueueApi.update(selected.id, edits)
      const r = await reviewQueueApi.approve(selected.id)
      toast.success(`Approved → Citation #${r.data.citation_id}`)
      setSelected(null)
      load()
    } catch {
      toast.error('Failed to approve')
    }
  }

  async function reject() {
    if (!selected) return
    if (!confirm('Reject and dismiss this match?')) return
    try {
      await reviewQueueApi.reject(selected.id)
      toast.success('Rejected')
      setSelected(null)
      load()
    } catch {
      toast.error('Failed to reject')
    }
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  const inp = 'w-full border border-gray-200 rounded px-2 py-1 text-sm'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Review Queue</h1>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Show:</span>
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); load(1, s) }}
              className={`text-sm px-3 py-1 rounded border ${
                statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* List */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {(data?.items ?? []).length === 0 && (
                  <p className="text-center text-gray-400 py-12 text-sm">No items in queue.</p>
                )}
                {(data?.items ?? []).map(item => (
                  <button
                    key={item.id}
                    onClick={() => select(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selected?.id === item.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{item.faculty}</span>
                      <Badge score={item.confidence_score} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {item.cited_in || item.link || 'Unknown document'}
                    </p>
                    <p className="text-xs text-gray-400">{item.publisher} · {format(new Date(item.created_at), 'MMM d, yyyy')}</p>
                  </button>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 py-3 border-t border-gray-100">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => { setPage(p); load(p) }}
                      className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail / edit panel */}
        {selected && (
          <div className="w-96 bg-white rounded-lg shadow-sm p-5 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Complete &amp; Confirm</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>

            {selected.matched_text && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-gray-700">
                <p className="font-medium text-yellow-800 mb-1">Matched text snippet</p>
                <p className="line-clamp-4">{selected.matched_text}</p>
              </div>
            )}

            {selected.link && (
              <a href={selected.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all block">
                {selected.link}
              </a>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Faculty</label>
                <input className={inp} value={edits.faculty ?? ''} onChange={e => setEdit('faculty', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Short Research Tag</label>
                <input className={inp} value={edits.short_research_tag ?? ''} onChange={e => setEdit('short_research_tag', e.target.value)} placeholder="e.g. Smith2022Pricing" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Type</label>
                <select className={inp} value={edits.citation_type ?? ''} onChange={e => setEdit('citation_type', e.target.value)}>
                  <option value="">Select…</option>
                  {CITATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Title of Paper</label>
                <textarea className={inp} rows={2} value={edits.title_of_paper ?? ''} onChange={e => setEdit('title_of_paper', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Publication Cited</label>
                <input className={inp} value={edits.publication_cited ?? ''} onChange={e => setEdit('publication_cited', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Yr Pub Cited</label>
                  <input type="number" className={inp} value={edits.year_of_publication_cited ?? ''} onChange={e => setEdit('year_of_publication_cited', Number(e.target.value))} min={1900} max={2100} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Yr Gov Doc</label>
                  <input type="number" className={inp} value={edits.year_of_government_publication ?? ''} onChange={e => setEdit('year_of_government_publication', Number(e.target.value))} min={1900} max={2100} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Policy Area</label>
                <select className={inp} value={edits.policy_area ?? ''} onChange={e => setEdit('policy_area', e.target.value)}>
                  <option value="">Select…</option>
                  {POLICY_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdits} className="flex-1 text-sm border border-gray-200 rounded py-1.5 hover:bg-gray-50">
                Save Draft
              </button>
              <button onClick={reject} className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100">
                Reject
              </button>
              <button onClick={approve} className="flex-1 text-sm bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700">
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

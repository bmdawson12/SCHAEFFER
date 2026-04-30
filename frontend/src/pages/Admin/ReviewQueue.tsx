<<<<<<< HEAD
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { reviewQueueApi } from '../../api/client'
import type { ReviewQueueItem, PaginatedResponse } from '../../types'
import { format } from 'date-fns'
=======
import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { reviewQueueApi, statsApi } from '../../api/client'
import type { ReviewQueueItem, PaginatedResponse } from '../../types'
import { format } from 'date-fns'
import { buildHighlightedUrl, openCitationLink } from '../../utils/linkUtils'
>>>>>>> f3759bd (initial commit)

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

<<<<<<< HEAD
=======
function ComboInput({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes((filter || value || '').toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button" className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 truncate"
              onClick={() => { onChange(o); setOpen(false) }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  )
}

>>>>>>> f3759bd (initial commit)
export default function ReviewQueue() {
  const [data, setData] = useState<PaginatedResponse<ReviewQueueItem> | null>(null)
  const [selected, setSelected] = useState<ReviewQueueItem | null>(null)
  const [edits, setEdits] = useState<Partial<ReviewQueueItem>>({})
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
<<<<<<< HEAD
=======
  const [existingTags, setExistingTags] = useState<string[]>([])
>>>>>>> f3759bd (initial commit)

  function load(p = page, sf = statusFilter) {
    setLoading(true)
    reviewQueueApi
      .list({ status: sf, page: p, page_size: 25 })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false))
  }

<<<<<<< HEAD
  useEffect(() => { load() }, [])
=======
  useEffect(() => {
    load()
    statsApi.filterOptions().then(r => setExistingTags(r.data.tags || [])).catch(() => {})
  }, [])
>>>>>>> f3759bd (initial commit)

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
<<<<<<< HEAD
        <h1 className="text-xl font-semibold text-gray-900">Review Queue</h1>
=======
        <h1 className="text-xl font-semibold text-gray-900">
            Review Queue
            {data && <span className="text-sm font-normal text-gray-400 ml-2">({total} {statusFilter})</span>}
          </h1>
>>>>>>> f3759bd (initial commit)
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Show:</span>
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); load(1, s) }}
              className={`text-sm px-3 py-1 rounded border ${
<<<<<<< HEAD
                statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'
=======
                statusFilter === s ? 'bg-[#990000] text-white border-[#990000]' : 'border-gray-200 hover:bg-gray-50'
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
=======
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#990000]" />
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
                      selected?.id === item.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
=======
                      selected?.id === item.id ? 'bg-red-50 border-l-2 border-[#990000]' : ''
>>>>>>> f3759bd (initial commit)
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{item.faculty}</span>
                      <Badge score={item.confidence_score} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {item.cited_in || item.link || 'Unknown document'}
                    </p>
<<<<<<< HEAD
                    <p className="text-xs text-gray-400">{item.publisher} · {format(new Date(item.created_at), 'MMM d, yyyy')}</p>
=======
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400">{item.publisher} · {format(new Date(item.created_at), 'MMM d, yyyy')}</p>
                      {item.link && (
                        <a
                          href={buildHighlightedUrl(item.link, item.faculty)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            openCitationLink(item.link!, item.faculty).then(({ isPdf }) => {
                              if (isPdf) toast('\ud83d\udccb "' + item.faculty + '" copied \u2014 press Ctrl+F in the PDF', { duration: 4000, icon: '\ud83d\udd0d' })
                            })
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline shrink-0"
                          title="Open source document (highlights the citation)"
                        >
                          View source ↗
                        </a>
                      )}
                    </div>
>>>>>>> f3759bd (initial commit)
                  </button>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 py-3 border-t border-gray-100">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => { setPage(p); load(p) }}
<<<<<<< HEAD
                      className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
=======
                      className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-[#990000] text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
              <a href={selected.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all block">
=======
              <a
                href={buildHighlightedUrl(selected.link, selected.faculty)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline break-all block"
                title="Opens source and scrolls to the mention"
                onClick={e => {
                  e.preventDefault()
                  openCitationLink(selected.link!, selected.faculty).then(({ isPdf }) => {
                    if (isPdf) toast('\ud83d\udccb "' + selected.faculty + '" copied \u2014 press Ctrl+F in the PDF', { duration: 4000, icon: '\ud83d\udd0d' })
                  })
                }}
              >
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
                <input className={inp} value={edits.short_research_tag ?? ''} onChange={e => setEdit('short_research_tag', e.target.value)} placeholder="e.g. Smith2022Pricing" />
=======
                <ComboInput className={inp} value={edits.short_research_tag ?? ''} onChange={v => setEdit('short_research_tag', v)} options={existingTags} placeholder="Type or select a tag…" />
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
              <button onClick={approve} className="flex-1 text-sm bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700">
=======
              <button onClick={approve} className="flex-1 text-sm bg-[#990000] text-white rounded py-1.5 hover:bg-[#7a0000]">
>>>>>>> f3759bd (initial commit)
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

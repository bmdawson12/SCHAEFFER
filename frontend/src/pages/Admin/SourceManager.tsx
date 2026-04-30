<<<<<<< HEAD
import { useEffect, useState } from 'react'
=======
import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
>>>>>>> f3759bd (initial commit)
import toast from 'react-hot-toast'
import { sourcesApi, ingestionApi } from '../../api/client'
import type { Source } from '../../types'
import { format } from 'date-fns'

const BLANK = {
  name: '', url: '', source_type: 'rss', agency_group: 'federal',
  is_enabled: true, check_frequency: 'daily',
}

const GROUPS: Record<string, string> = {
  federal: 'Federal',
  congressional: 'Congressional',
  state: 'State & Local',
  medical: 'Medical / Professional',
}

<<<<<<< HEAD
=======
interface IngestionProgress {
  running: boolean
  phase: string
  current_source: string
  sources_done: number
  sources_total: number
  docs_checked: number
  matches_found: number
}

>>>>>>> f3759bd (initial commit)
export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>([])
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [running, setRunning] = useState(false)
<<<<<<< HEAD
  const [ingestionStatus, setIngestionStatus] = useState<Record<string, unknown>>({})

  function load() { sourcesApi.list().then(r => setSources(r.data)) }
  function pollStatus() { ingestionApi.status().then(r => setIngestionStatus(r.data)) }
=======
  const [progress, setProgress] = useState<IngestionProgress>({ running: false, phase: '', current_source: '', sources_done: 0, sources_total: 0, docs_checked: 0, matches_found: 0 })
  const [lastReport, setLastReport] = useState<{ sources: number; docs: number; matches: number; finishedAt: Date } | null>(null)
  const prevRunning = useRef(false)

  function load() { sourcesApi.list().then(r => setSources(r.data)) }
  function pollStatus() {
    ingestionApi.status().then(r => {
      const p = r.data as IngestionProgress
      // Detect completion: was running, now stopped
      if (prevRunning.current && !p.running) {
        const srcCount = p.sources_total || p.sources_done
        setLastReport({ sources: srcCount, docs: p.docs_checked, matches: p.matches_found, finishedAt: new Date() })
        if (p.matches_found > 0) {
          toast.success(
            `Ingestion complete: ${p.matches_found} new match${p.matches_found === 1 ? '' : 'es'} from ${p.docs_checked} docs across ${srcCount} source${srcCount === 1 ? '' : 's'}`,
            { duration: 7000 }
          )
        } else {
          toast(
            `Ingestion complete — no new citations found (${p.docs_checked} docs checked across ${srcCount} source${srcCount === 1 ? '' : 's'})`,
            { duration: 6000, icon: '—' }
          )
        }
        load() // refresh source list to update "last checked" dates
      }
      prevRunning.current = p.running
      setProgress(p)
    })
  }
>>>>>>> f3759bd (initial commit)

  useEffect(() => {
    load()
    pollStatus()
<<<<<<< HEAD
    const t = setInterval(pollStatus, 5000)
=======
    const t = setInterval(pollStatus, 2000)
>>>>>>> f3759bd (initial commit)
    return () => clearInterval(t)
  }, [])

  function set(key: string, value: unknown) { setForm(f => ({ ...f, [key]: value })) }

  function startEdit(s: Source) {
    setEditingId(s.id)
    setForm({ name: s.name, url: s.url, source_type: s.source_type, agency_group: s.agency_group ?? 'federal', is_enabled: s.is_enabled, check_frequency: s.check_frequency })
    setShowAdd(true)
  }

  function cancel() { setEditingId(null); setForm(BLANK); setShowAdd(false) }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Name and URL are required'); return }
    try {
      if (editingId) {
        await sourcesApi.update(editingId, form)
        toast.success('Source updated')
      } else {
        await sourcesApi.create(form)
        toast.success('Source added')
      }
      cancel(); load()
    } catch { toast.error('Failed to save') }
  }

  async function toggle(id: number) {
    try { await sourcesApi.toggle(id); load() }
    catch { toast.error('Failed') }
  }

  async function deleteSource(id: number, name: string) {
    if (!confirm(`Delete source "${name}"?`)) return
    try { await sourcesApi.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  async function runIngestion(ids?: number[]) {
    setRunning(true)
    try {
      await ingestionApi.run(ids)
<<<<<<< HEAD
      toast.success('Ingestion started in background')
=======
      toast.success('Ingestion started')
>>>>>>> f3759bd (initial commit)
    } catch { toast.error('Failed to start ingestion') }
    finally { setRunning(false) }
  }

  const grouped = sources.reduce<Record<string, Source[]>>((acc, s) => {
    const g = s.agency_group ?? 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  const inp = 'w-full border border-gray-200 rounded px-3 py-1.5 text-sm'
<<<<<<< HEAD
=======
  const pct = progress.sources_total > 0 ? Math.round((progress.sources_done / progress.sources_total) * 100) : 0
>>>>>>> f3759bd (initial commit)

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Sources <span className="text-gray-400 text-base font-normal">({sources.length})</span></h1>
        <div className="flex gap-2 items-center">
<<<<<<< HEAD
          {(ingestionStatus.running as boolean) && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <span className="animate-pulse">●</span> Ingestion running…
            </span>
          )}
          <button
            onClick={() => runIngestion()}
            disabled={running || !!(ingestionStatus.running as boolean)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
=======
          <button
            onClick={() => runIngestion()}
            disabled={running || progress.running}
            className="text-sm bg-[#990000] text-white px-3 py-1.5 rounded hover:bg-[#7a0000] disabled:opacity-50"
>>>>>>> f3759bd (initial commit)
          >
            Run All Now
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="text-sm border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50">
            + Add Source
          </button>
        </div>
      </div>

<<<<<<< HEAD
=======
      {/* Progress bar */}
      {progress.running && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#FFCC00] animate-pulse" />
              <span className="text-sm font-medium text-gray-700">{progress.phase || 'Starting…'}</span>
            </div>
            <span className="text-xs text-gray-500">
              {progress.docs_checked} docs · {progress.matches_found} matches
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(pct, 3)}%`,
                background: 'linear-gradient(90deg, #990000, #cc0000)',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-400">
              {progress.current_source ? `Scanning ${progress.current_source}` : 'Initializing…'}
            </span>
            <span className="text-xs text-gray-400">
              {progress.sources_done}/{progress.sources_total} sources · {pct}%
            </span>
          </div>
        </div>
      )}

      {/* Last run report */}
      {!progress.running && lastReport && (
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#990000]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Last Ingestion Report</h3>
              <p className="text-xs text-gray-400 mt-0.5">Completed {lastReport.finishedAt.toLocaleTimeString()}</p>
              <div className="grid grid-cols-3 gap-6 mt-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{lastReport.sources}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mt-0.5">Sources</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{lastReport.docs.toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mt-0.5">Documents</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#990000]">{lastReport.matches}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mt-0.5">New Matches</p>
                </div>
              </div>
              {lastReport.matches > 0 && (
                <Link to="/admin/review-queue" className="text-xs text-[#990000] hover:underline mt-3 inline-block font-medium">
                  Review {lastReport.matches} new match{lastReport.matches === 1 ? '' : 'es'} →
                </Link>
              )}
            </div>
            <button
              onClick={() => setLastReport(null)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

>>>>>>> f3759bd (initial commit)
      {/* Add/edit form */}
      {showAdd && (
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4">{editingId ? 'Edit Source' : 'Add Source'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
              <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Source name" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">URL *</label>
              <input type="url" className={inp} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select className={inp} value={form.source_type} onChange={e => set('source_type', e.target.value)}>
<<<<<<< HEAD
                <option value="rss">RSS</option>
                <option value="scrape">Web Scrape</option>
                <option value="api">API</option>
              </select>
=======
                <option value="rss" title="Monitors an RSS/Atom feed for new entries">RSS</option>
                <option value="scrape" title="Scrapes a web page for links to documents">Web Scrape</option>
                <option value="api" title="Queries a structured API endpoint">API</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                {form.source_type === 'rss' && 'Monitors an RSS/Atom feed for new publications'}
                {form.source_type === 'scrape' && 'Scrapes a web page and follows links to find documents'}
                {form.source_type === 'api' && 'Queries a structured API for document listings'}
              </p>
>>>>>>> f3759bd (initial commit)
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Group</label>
              <select className={inp} value={form.agency_group} onChange={e => set('agency_group', e.target.value)}>
                {Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
<<<<<<< HEAD
            <button onClick={save} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
=======
            <button onClick={save} className="bg-[#990000] text-white text-sm px-4 py-1.5 rounded hover:bg-[#7a0000]">
>>>>>>> f3759bd (initial commit)
              {editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={cancel} className="text-sm border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(GROUPS).map(([group, groupLabel]) => {
        const items = grouped[group] ?? []
        return (
          <div key={group} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {groupLabel} <span className="text-gray-300 font-normal">({items.length})</span>
              </h2>
            </div>
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-3 text-gray-400 text-xs">No sources in this group.</td></tr>
                )}
                {items.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${!s.is_enabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium w-64">{s.name}</td>
                    <td className="px-4 py-2.5">
<<<<<<< HEAD
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.source_type === 'rss' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
=======
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.source_type === 'rss' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
>>>>>>> f3759bd (initial commit)
                        {s.source_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {s.last_checked ? `Checked ${format(new Date(s.last_checked), 'MMM d')}` : 'Never checked'}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggle(s.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          s.is_enabled
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {s.is_enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3 justify-end">
<<<<<<< HEAD
                        <button onClick={() => runIngestion([s.id])} disabled={!!(ingestionStatus.running as boolean)} className="text-xs text-violet-600 hover:underline disabled:opacity-40">Run</button>
                        <button onClick={() => startEdit(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => deleteSource(s.id, s.name)} className="text-xs text-red-500 hover:underline">Delete</button>
=======
                        <button onClick={() => runIngestion([s.id])} disabled={progress.running} className="text-xs text-[#990000] hover:underline disabled:opacity-40">Run</button>
                        <button onClick={() => startEdit(s)} className="text-xs text-gray-600 hover:underline">Edit</button>
                        <button onClick={() => deleteSource(s.id, s.name)} className="text-xs text-red-400 hover:underline">Delete</button>
>>>>>>> f3759bd (initial commit)
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

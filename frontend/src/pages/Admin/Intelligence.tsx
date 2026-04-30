import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { intelligenceApi } from '../../api/client'

interface SourceScore {
  source_id: number
  source_name: string
  source_url: string
  is_enabled: boolean
  domain: string
  total_review_items: number
  approved: number
  rejected: number
  pending: number
  approval_rate: number | null
  citation_count: number
  total_docs_checked: number
  total_matches_found: number
  run_count: number
  yield_score: number
}

interface UncoveredDomain {
  domain: string
  citation_count: number
  sample_urls: string[]
  publishers: string[]
  suggested_name: string
  suggested_type: string
  suggested_url: string
  url_patterns: string[]
}

interface UrlPattern {
  pattern: string
  citation_count: number
  domains: string[]
  publishers: string[]
}

interface Report {
  summary: {
    total_sources: number
    active_sources: number
    top_performers_count: number
    underperformer_count: number
    uncovered_domains: number
    uncovered_citations: number
  }
  source_performance: SourceScore[]
  uncovered_domains: UncoveredDomain[]
  url_patterns: UrlPattern[]
  priority_order: number[]
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 50
    ? 'bg-green-100 text-green-700'
    : score >= 20
    ? 'bg-yellow-100 text-yellow-700'
    : score > 0
    ? 'bg-orange-100 text-orange-700'
    : 'bg-gray-100 text-gray-400'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {score > 0 ? score.toFixed(0) : '—'}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Intelligence() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'performance' | 'gaps' | 'patterns'>('performance')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    intelligenceApi.report()
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load intelligence report'))
      .finally(() => setLoading(false))
  }, [])

  async function addSource(domain: string, name: string) {
    setAdding(domain)
    try {
      await intelligenceApi.addSuggested(domain, name)
      toast.success(`Added "${name}" as a new source`)
      // Refresh report
      const r = await intelligenceApi.report()
      setReport(r.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add source'
      toast.error(msg)
    } finally {
      setAdding(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#990000]" />
      </div>
    )
  }

  if (!report) return null

  const { summary, source_performance, uncovered_domains, url_patterns } = report
  const maxCitations = Math.max(...source_performance.map(s => s.citation_count), 1)

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Source Intelligence</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Learning from past citations to optimize discovery
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#990000]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Top Performers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.top_performers_count}</p>
          <p className="text-[10px] text-gray-400">of {summary.total_sources} sources</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#FFCC00]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Underperformers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.underperformer_count}</p>
          <p className="text-[10px] text-gray-400">zero citations found</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Uncovered Domains</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.uncovered_domains}</p>
          <p className="text-[10px] text-gray-400">producing citations</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Missed Citations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.uncovered_citations}</p>
          <p className="text-[10px] text-gray-400">from uncovered domains</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['performance', 'Source Performance'],
          ['gaps', `Discovery Gaps (${uncovered_domains.length})`],
          ['patterns', 'URL Patterns'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              tab === key
                ? 'border-[#990000] text-[#990000] font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Performance tab */}
      {tab === 'performance' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium text-center">Score</th>
                <th className="px-4 py-2.5 font-medium">Historical Citations</th>
                <th className="px-4 py-2.5 font-medium text-center">Review Queue</th>
                <th className="px-4 py-2.5 font-medium text-center">Approval Rate</th>
                <th className="px-4 py-2.5 font-medium text-center">Docs Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {source_performance.map(s => (
                <tr key={s.source_id} className={`hover:bg-gray-50 ${!s.is_enabled ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{s.source_name}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{s.domain}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <ScoreBadge score={s.yield_score} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <MiniBar value={s.citation_count} max={maxCitations} color="bg-[#990000]" />
                      <span className="text-xs text-gray-600">{s.citation_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {s.total_review_items > 0 ? (
                      <span className="text-xs">
                        <span className="text-green-600">{s.approved}</span>
                        {' / '}
                        <span className="text-red-500">{s.rejected}</span>
                        {' / '}
                        <span className="text-yellow-600">{s.pending}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {s.approval_rate != null ? (
                      <span className={`text-xs font-medium ${s.approval_rate >= 80 ? 'text-green-600' : s.approval_rate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {s.approval_rate}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                    {s.total_docs_checked > 0 ? s.total_docs_checked.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gaps tab */}
      {tab === 'gaps' && (
        <div className="space-y-3">
          {uncovered_domains.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-400 text-sm">
              All citation domains are covered by configured sources.
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                These domains appear in your confirmed citations but don't have a configured source.
                Adding them could help discover new citations automatically.
              </p>
              {uncovered_domains.map(d => (
                <div key={d.domain} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">{d.domain}</h3>
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          {d.citation_count} citation{d.citation_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {d.publishers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Publisher: {d.publishers.join(', ')}
                        </p>
                      )}
                      {d.url_patterns.length > 0 && (
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          {d.url_patterns.map((p, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      {d.sample_urls.length > 0 && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
                            Sample URLs ({d.sample_urls.length})
                          </summary>
                          <div className="mt-1 space-y-0.5">
                            {d.sample_urls.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer"
                                className="text-[10px] text-blue-500 hover:underline block truncate max-w-lg">
                                {u}
                              </a>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                    <button
                      onClick={() => addSource(d.domain, d.suggested_name)}
                      disabled={adding === d.domain}
                      className="shrink-0 text-xs bg-[#990000] text-white px-3 py-1.5 rounded hover:bg-[#7a0000] disabled:opacity-50"
                    >
                      {adding === d.domain ? 'Adding…' : '+ Add Source'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Patterns tab */}
      {tab === 'patterns' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">
              URL path patterns where citations are most commonly found.
              Use these to optimize deep scraper configurations.
            </p>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-2 font-medium">URL Pattern</th>
                <th className="px-4 py-2 font-medium text-center">Citations</th>
                <th className="px-4 py-2 font-medium">Publisher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {url_patterns.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 max-w-md truncate">
                    {p.pattern}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-xs font-medium text-[#990000]">{p.citation_count}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[200px]">
                    {p.publishers.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

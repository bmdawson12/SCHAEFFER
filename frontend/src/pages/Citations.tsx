import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { citationsApi, statsApi } from '../api/client'
import type { Citation, CitationFilters, PaginatedResponse } from '../types'

const EMPTY: CitationFilters = {
  faculty: '', publisher: '', policy_area: '', citation_type: '',
  year_gov: undefined, year_pub: undefined, search: '',
  page: 1, page_size: 50,
}

export default function Citations() {
  const [data, setData] = useState<PaginatedResponse<Citation> | null>(null)
  const [filters, setFilters] = useState<CitationFilters>(EMPTY)
  const [options, setOptions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback((f: CitationFilters) => {
    setLoading(true)
    const params: Record<string, unknown> = {}
    if (f.faculty) params.faculty = f.faculty
    if (f.publisher) params.publisher = f.publisher
    if (f.policy_area) params.policy_area = f.policy_area
    if (f.citation_type) params.citation_type = f.citation_type
    if (f.year_gov) params.year_gov = f.year_gov
    if (f.year_pub) params.year_pub = f.year_pub
    if (f.search) params.search = f.search
    params.page = f.page ?? 1
    params.page_size = f.page_size ?? 50

    citationsApi
      .list(params)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load citations'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(filters)
    statsApi.filterOptions().then(r => setOptions(r.data))
  }, [])

  function applyFilter(key: keyof CitationFilters, value: unknown) {
    const next = { ...filters, [key]: value, page: 1 }
    setFilters(next)
    load(next)
  }

  function changePage(p: number) {
    const next = { ...filters, page: p }
    setFilters(next)
    load(next)
  }

  function handleExport() {
    const params: Record<string, unknown> = {}
    if (filters.faculty) params.faculty = filters.faculty
    if (filters.publisher) params.publisher = filters.publisher
    if (filters.policy_area) params.policy_area = filters.policy_area
    window.open(citationsApi.exportUrl(params), '_blank')
  }

  function clearFilters() {
    setFilters(EMPTY)
    load(EMPTY)
  }

  const total = data?.total ?? 0
  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 50
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Citations</h1>
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
          <button
            onClick={handleExport}
            className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded hover:bg-emerald-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search ?? ''}
          onChange={e => applyFilter('search', e.target.value)}
          className="col-span-2 border border-gray-200 rounded px-3 py-1.5 text-sm"
        />
        <select
          value={filters.faculty ?? ''}
          onChange={e => applyFilter('faculty', e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All Faculty</option>
          {(options.faculty ?? []).map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={filters.publisher ?? ''}
          onChange={e => applyFilter('publisher', e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All Publishers</option>
          {(options.publishers ?? []).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filters.policy_area ?? ''}
          onChange={e => applyFilter('policy_area', e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All Policy Areas</option>
          {(options.policy_areas ?? []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filters.citation_type ?? ''}
          onChange={e => applyFilter('citation_type', e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          {(options.types ?? []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    'Tag', 'Type', 'Title of Paper', 'Publication Cited', 'Yr Pub',
                    'Faculty', 'Cited In', 'Yr Gov', 'Publisher', 'Policy Area', 'Link',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                      No citations found.
                    </td>
                  </tr>
                ) : (
                  (data?.items ?? []).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link to={`/citations/${c.id}`} className="text-blue-600 hover:underline font-medium">
                          {c.short_research_tag || <span className="text-gray-300">—</span>}
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.citation_type || '—'}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={c.title_of_paper}>
                        {c.title_of_paper || '—'}
                      </td>
                      <td className="px-3 py-2 max-w-[160px] truncate text-gray-600" title={c.publication_cited}>
                        {c.publication_cited || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.year_of_publication_cited || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{c.faculty}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={c.cited_in}>
                        {c.cited_in || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.year_of_government_publication || '—'}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate text-gray-600" title={c.publisher}>
                        {c.publisher || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.policy_area || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.link ? (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                          >
                            Link
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
                  {total.toLocaleString()}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => changePage(page - 1)}
                    disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`px-2 py-1 rounded border ${
                          p === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => changePage(page + 1)}
                    disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

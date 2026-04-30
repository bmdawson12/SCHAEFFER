<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { citationsApi, statsApi } from '../api/client'
import type { Citation, CitationFilters, PaginatedResponse } from '../types'
=======
import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { citationsApi, statsApi } from '../api/client'
import type { Citation, CitationFilters, PaginatedResponse } from '../types'
import { buildHighlightedUrl, openCitationLink } from '../utils/linkUtils'

type SortKey =
  | 'short_research_tag' | 'citation_type' | 'title_of_paper'
  | 'publication_cited' | 'year_of_publication_cited' | 'faculty'
  | 'cited_in' | 'year_of_government_publication' | 'publisher' | 'policy_area'

const COLS: { key: SortKey | null; label: string }[] = [
  { key: 'short_research_tag', label: 'Tag' },
  { key: 'citation_type', label: 'Type' },
  { key: 'title_of_paper', label: 'Title of Paper' },
  { key: 'publication_cited', label: 'Publication Cited' },
  { key: 'year_of_publication_cited', label: 'Yr Pub' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'cited_in', label: 'Cited In' },
  { key: 'year_of_government_publication', label: 'Yr Gov' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'policy_area', label: 'Policy Area' },
  { key: null, label: 'Link' },
]
>>>>>>> f3759bd (initial commit)

const EMPTY: CitationFilters = {
  faculty: '', publisher: '', policy_area: '', citation_type: '',
  year_gov: undefined, year_pub: undefined, search: '',
  page: 1, page_size: 50,
}

export default function Citations() {
<<<<<<< HEAD
  const [data, setData] = useState<PaginatedResponse<Citation> | null>(null)
  const [filters, setFilters] = useState<CitationFilters>(EMPTY)
  const [options, setOptions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
=======
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<Citation> | null>(null)
  const [filters, setFilters] = useState<CitationFilters>(() => {
    const init: CitationFilters = { ...EMPTY }
    const faculty = searchParams.get('faculty')
    if (faculty) init.faculty = faculty
    const yearGov = searchParams.get('year_gov')
    if (yearGov) init.year_gov = Number(yearGov)
    const publisher = searchParams.get('publisher')
    if (publisher) init.publisher = publisher
    const policyArea = searchParams.get('policy_area')
    if (policyArea) init.policy_area = policyArea
    const citationType = searchParams.get('citation_type')
    if (citationType) init.citation_type = citationType
    const search = searchParams.get('search')
    if (search) init.search = search
    return init
  })
  const [searchText, setSearchText] = useState(() => {
    return searchParams.get('search') ?? ''
  })
  const [options, setOptions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  function toggleSort(key: SortKey) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null // third click clears sort
    })
  }

  const sortedItems = useMemo(() => {
    const items = data?.items ?? []
    if (!sort) return items
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const av = a[key]; const bv = b[key]
      // Nulls always sort last
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * mul
    })
  }, [data?.items, sort])
>>>>>>> f3759bd (initial commit)

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

<<<<<<< HEAD
=======
  // Debounce search input: only call applyFilter after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== (filters.search ?? '')) {
        applyFilter('search', searchText)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchText])

>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
=======
    if (filters.citation_type) params.citation_type = filters.citation_type
    if (filters.year_gov) params.year_gov = filters.year_gov
    if (filters.year_pub) params.year_pub = filters.year_pub
    if (filters.search) params.search = filters.search
>>>>>>> f3759bd (initial commit)
    window.open(citationsApi.exportUrl(params), '_blank')
  }

  function clearFilters() {
<<<<<<< HEAD
=======
    setSearchText('')
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
        <h1 className="text-xl font-semibold text-gray-900">Citations</h1>
=======
        <h1 className="text-xl font-semibold text-gray-900">
          Citations
          {data && <span className="text-sm font-normal text-gray-400 ml-2">({total.toLocaleString()} results)</span>}
        </h1>
>>>>>>> f3759bd (initial commit)
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
          <button
            onClick={handleExport}
<<<<<<< HEAD
            className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded hover:bg-emerald-700"
=======
            className="bg-[#990000] text-white text-sm px-3 py-1.5 rounded hover:bg-[#7a0000]"
>>>>>>> f3759bd (initial commit)
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
<<<<<<< HEAD
      <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search ?? ''}
          onChange={e => applyFilter('search', e.target.value)}
=======
      <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
=======
          value={filters.year_gov ?? ''}
          onChange={e => applyFilter('year_gov', e.target.value ? Number(e.target.value) : undefined)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">All Years</option>
          {((options as Record<string, unknown>).years_gov as number[] ?? []).map((y: number) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
=======
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#990000]" />
>>>>>>> f3759bd (initial commit)
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
<<<<<<< HEAD
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
=======
                  {COLS.map(col => {
                    const active = col.key && sort?.key === col.key
                    const arrow = active ? (sort!.dir === 'asc' ? '▲' : '▼') : ''
                    const base = 'text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'
                    if (!col.key) {
                      return <th key={col.label} className={base}>{col.label}</th>
                    }
                    return (
                      <th
                        key={col.label}
                        onClick={() => toggleSort(col.key as SortKey)}
                        className={`${base} cursor-pointer select-none hover:text-[#990000] ${active ? 'text-[#990000]' : ''}`}
                        title="Click to sort"
                      >
                        {col.label} <span className="text-[9px] ml-0.5">{arrow || '↕'}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.length === 0 ? (
>>>>>>> f3759bd (initial commit)
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                      No citations found.
                    </td>
                  </tr>
                ) : (
<<<<<<< HEAD
                  (data?.items ?? []).map(c => (
=======
                  sortedItems.map(c => (
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
                        {c.cited_in || '—'}
=======
                        {c.link && c.cited_in ? (
                          <a
                            href={buildHighlightedUrl(c.link, c.faculty)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                            title="Open source document"
                            onClick={e => {
                              e.preventDefault()
                              openCitationLink(c.link!, c.faculty).then(({ isPdf }) => {
                                if (isPdf) toast('\ud83d\udccb "' + c.faculty + '" copied \u2014 press Ctrl+F in the PDF', { duration: 4000, icon: '\ud83d\udd0d' })
                              })
                            }}
                          >
                            {c.cited_in}
                          </a>
                        ) : (c.cited_in || '—')}
>>>>>>> f3759bd (initial commit)
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.year_of_government_publication || '—'}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate text-gray-600" title={c.publisher}>
                        {c.publisher || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{c.policy_area || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.link ? (
                          <a
<<<<<<< HEAD
                            href={c.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline text-xs"
=======
                            href={buildHighlightedUrl(c.link, c.faculty)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                            title="Opens the source document and jumps to where this person is mentioned"
                            onClick={e => {
                              e.preventDefault()
                              openCitationLink(c.link!, c.faculty).then(({ isPdf }) => {
                                if (isPdf) toast('\ud83d\udccb "' + c.faculty + '" copied \u2014 press Ctrl+F in the PDF', { duration: 4000, icon: '\ud83d\udd0d' })
                              })
                            }}
>>>>>>> f3759bd (initial commit)
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
<<<<<<< HEAD
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
=======
                  {(() => {
                    const pages: (number | string)[] = []
                    const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p) }
                    addPage(1)
                    if (page - 1 > 2) pages.push('start-ellipsis')
                    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) addPage(p)
                    if (page + 1 < totalPages - 1) pages.push('end-ellipsis')
                    if (totalPages > 1) addPage(totalPages)
                    return pages.map(p =>
                      typeof p === 'string' ? (
                        <span key={p} className="px-2 py-1 text-gray-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => changePage(p)}
                          className={`px-2 py-1 rounded border ${
                            p === page
                              ? 'bg-[#990000] text-white border-[#990000]'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  })()}
>>>>>>> f3759bd (initial commit)
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

<<<<<<< HEAD
import { Link, useLocation } from 'react-router-dom'
=======
import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { databaseApi, statsApi } from '../api/client'
>>>>>>> f3759bd (initial commit)

const NAV = [
  {
    section: 'Dashboard',
    items: [
<<<<<<< HEAD
      { path: '/', label: 'Overview' },
      { path: '/citations', label: 'Citations' },
=======
      { path: '/', label: 'Overview', icon: 'chart' },
      { path: '/citations', label: 'Citations', icon: 'list' },
>>>>>>> f3759bd (initial commit)
    ],
  },
  {
    section: 'Admin',
    items: [
<<<<<<< HEAD
      { path: '/admin', label: 'New Citation' },
      { path: '/admin/review-queue', label: 'Review Queue' },
      { path: '/admin/people', label: 'People' },
      { path: '/admin/sources', label: 'Sources' },
=======
      { path: '/admin', label: 'New Citation', icon: 'plus' },
      { path: '/admin/review-queue', label: 'Review Queue', icon: 'inbox' },
      { path: '/admin/people', label: 'People', icon: 'users' },
      { path: '/admin/sources', label: 'Sources', icon: 'globe' },
      { path: '/admin/intelligence', label: 'Intelligence', icon: 'brain' },
>>>>>>> f3759bd (initial commit)
    ],
  },
]

<<<<<<< HEAD
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-200">
          <h1 className="text-base font-semibold text-blue-700 leading-tight">
            Citation Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Gov Publication Tracker</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                {section}
              </p>
              {items.map(({ path, label }) => {
                const active =
                  path === '/' ? pathname === '/' : pathname.startsWith(path)
=======
function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || 'w-4 h-4'
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: cls }

  switch (icon) {
    case 'chart':
      return <svg {...props}><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
    case 'list':
      return <svg {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    case 'plus':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    case 'inbox':
      return <svg {...props}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>
    case 'users':
      return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    case 'globe':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
    case 'brain':
      return <svg {...props}><path d="M9.5 2A5.5 5.5 0 005 7.5c0 .96.25 1.87.7 2.66A5.5 5.5 0 003 15a5.5 5.5 0 005.5 5.5c.96 0 1.87-.25 2.66-.7.32.18.66.33 1.02.44"/><path d="M14.5 2A5.5 5.5 0 0120 7.5c0 .96-.25 1.87-.7 2.66A5.5 5.5 0 0121 15a5.5 5.5 0 01-5.5 5.5c-.96 0-1.87-.25-2.66-.7"/><path d="M12 2v20"/></svg>
    default:
      return null
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load pending review count for badge
  useEffect(() => {
    statsApi.overview().then(r => setPendingCount(r.data.pending_review ?? 0)).catch(() => {})
    // Refresh every 60s
    const t = setInterval(() => {
      statsApi.overview().then(r => setPendingCount(r.data.pending_review ?? 0)).catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  // Keyboard shortcut: Cmd+B or Ctrl+B toggles sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleExport = () => {
    window.location.href = databaseApi.exportUrl()
    toast.success('Database export started')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm('Replace the current database with the uploaded file? This cannot be undone.')) {
      e.target.value = ''
      return
    }
    setImporting(true)
    try {
      await databaseApi.importDb(file)
      toast.success('Database imported successfully. Reloading...')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      toast.error(message)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-200 ${
          collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-56'
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-200">
          <img src="/usc-schaeffer.svg" alt="USC Schaeffer Center" className="w-48" />
        </div>

        <nav className="flex-1 overflow-y-auto py-1 px-3 space-y-5 mt-2">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1 whitespace-nowrap">
                {section}
              </p>
              {items.map(({ path, label, icon }) => {
                const active =
                  path === '/' || path === '/admin'
                    ? pathname === path
                    : pathname === path || pathname.startsWith(path + '/')
>>>>>>> f3759bd (initial commit)
                return (
                  <Link
                    key={path}
                    to={path}
<<<<<<< HEAD
                    className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
=======
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-red-50 text-[#990000] font-medium border-l-2 border-[#990000] -ml-[2px]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <NavIcon icon={icon} className={`w-4 h-4 shrink-0 ${active ? 'text-[#990000]' : 'text-gray-400'}`} />
                    {label}
                    {path === '/admin/review-queue' && pendingCount > 0 && (
                      <span className="ml-auto text-[10px] bg-[#990000] text-white rounded-full px-1.5 py-0.5 leading-none font-medium min-w-[18px] text-center">
                        {pendingCount}
                      </span>
                    )}
>>>>>>> f3759bd (initial commit)
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
<<<<<<< HEAD
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-screen-2xl mx-auto p-6">{children}</div>
      </main>
=======

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 text-center">
            {'\u2318'}B to toggle sidebar
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar with toggle */}
        <div className="h-10 flex items-center px-4 border-b border-gray-100 bg-white shrink-0 gap-3">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Show sidebar (\u2318B)' : 'Hide sidebar (\u2318B)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="14 9 17 12 14 15" />
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="15 9 12 12 15 15" />
                </>
              )}
            </svg>
          </button>
          {collapsed && (
            <img src="/usc-schaeffer-compact.svg" alt="USC Schaeffer" className="h-5" />
          )}
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#990000]">Citation Monitor</span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export DB */}
          <button
            onClick={handleExport}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-[#990000] transition-colors"
            title="Export database (.db file)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {/* Import DB */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-[#990000] transition-colors disabled:opacity-50"
            title="Import database (.db file)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
>>>>>>> f3759bd (initial commit)
    </div>
  )
}

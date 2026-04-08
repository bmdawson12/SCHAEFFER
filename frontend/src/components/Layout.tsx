import { Link, useLocation } from 'react-router-dom'

const NAV = [
  {
    section: 'Dashboard',
    items: [
      { path: '/', label: 'Overview' },
      { path: '/citations', label: 'Citations' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { path: '/admin', label: 'New Citation' },
      { path: '/admin/review-queue', label: 'Review Queue' },
      { path: '/admin/people', label: 'People' },
      { path: '/admin/sources', label: 'Sources' },
    ],
  },
]

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
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-screen-2xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

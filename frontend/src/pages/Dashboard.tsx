import { useEffect, useState } from 'react'
<<<<<<< HEAD
=======
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { buildHighlightedUrl, openCitationLink } from '../utils/linkUtils'
>>>>>>> f3759bd (initial commit)
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { statsApi } from '../api/client'
import type { OverviewStats } from '../types'
<<<<<<< HEAD
import { format } from 'date-fns'

function StatCard({
  label, value, sub, color,
}: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${color} p-5`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
=======
import { format, formatDistanceToNow } from 'date-fns'

function StatCard({
  label, value, sub, color, onClick,
}: { label: string; value: number; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 ${color} p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
>>>>>>> f3759bd (initial commit)
      <p className="text-3xl font-bold mt-1 text-gray-900">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
<<<<<<< HEAD
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<{ month: string; citations: number }[]>([])
  const [period, setPeriod] = useState('12m')
=======
  const navigate = useNavigate()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<{ year: string; citations: number }[]>([])
  const [period, setPeriod] = useState('5y')
>>>>>>> f3759bd (initial commit)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([statsApi.overview(), statsApi.citationsOverTime(period)])
      .then(([s, t]) => {
        setStats(s.data)
        const { labels, data } = t.data
<<<<<<< HEAD
        setTimeSeries(labels.map((l: string, i: number) => ({ month: l, citations: data[i] })))
=======
        setTimeSeries(labels.map((l: string, i: number) => ({ year: l, citations: data[i] })))
>>>>>>> f3759bd (initial commit)
      })
      .finally(() => setLoading(false))
  }, [period])

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
<<<<<<< HEAD
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )

=======
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#990000]" />
      </div>
    )

  if (stats?.total_citations === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Welcome to Citation Monitor!</h2>
          <p className="text-gray-500 mb-6">Get started by:</p>
          <div className="space-y-3 text-sm text-gray-600 max-w-md mx-auto text-left">
            <p>
              <span className="inline-block w-6 h-6 rounded-full bg-[#990000] text-white text-center leading-6 mr-3 text-xs font-bold">1</span>
              <Link to="/admin/people" className="text-blue-600 hover:underline font-medium">Add faculty members</Link> in People
            </p>
            <p>
              <span className="inline-block w-6 h-6 rounded-full bg-[#990000] text-white text-center leading-6 mr-3 text-xs font-bold">2</span>
              <Link to="/admin/sources" className="text-blue-600 hover:underline font-medium">Configure government sources</Link> in Sources
            </p>
            <p>
              <span className="inline-block w-6 h-6 rounded-full bg-[#990000] text-white text-center leading-6 mr-3 text-xs font-bold">3</span>
              <Link to="/admin/sources" className="text-blue-600 hover:underline font-medium">Run ingestion</Link> to discover citations
            </p>
          </div>
        </div>
      </div>
    )
  }

>>>>>>> f3759bd (initial commit)
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Overview</h1>

      {/* Stat cards */}
<<<<<<< HEAD
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Citations" value={stats?.total_citations ?? 0} color="border-blue-500" />
=======
      <div className="grid grid-cols-2 2xl:grid-cols-4 gap-4">
        <StatCard label="Total Citations" value={stats?.total_citations ?? 0} color="border-[#990000]" onClick={() => navigate('/citations')} />
>>>>>>> f3759bd (initial commit)
        <StatCard
          label="Pending Review"
          value={stats?.pending_review ?? 0}
          sub="Awaiting confirmation"
<<<<<<< HEAD
          color="border-amber-400"
        />
        <StatCard label="People Tracked" value={stats?.total_people ?? 0} color="border-emerald-500" />
        <StatCard label="Active Sources" value={stats?.total_sources ?? 0} color="border-violet-500" />
      </div>

=======
          color="border-[#FFCC00]"
          onClick={() => navigate('/admin/review-queue')}
        />
        <StatCard label="People Tracked" value={stats?.total_people ?? 0} color="border-gray-800" onClick={() => navigate('/admin/people')} />
        <StatCard label="Active Sources" value={stats?.total_sources ?? 0} color="border-gray-400" onClick={() => navigate('/admin/sources')} />
      </div>

      {/* Last ingestion indicator */}
      {stats?.last_ingestion && (
        <div className="flex items-center gap-3 text-xs text-gray-400 -mt-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>
            Last ingestion: {stats.last_ingestion.completed_at
              ? formatDistanceToNow(new Date(stats.last_ingestion.completed_at), { addSuffix: true })
              : 'unknown'
            }
            {stats.last_ingestion.status === 'completed'
              ? ` · ${stats.last_ingestion.documents_checked} docs checked, ${stats.last_ingestion.matches_found} matches`
              : ` · ${stats.last_ingestion.status}`
            }
          </span>
          <Link to="/admin/sources" className="text-[#990000] hover:underline font-medium ml-auto">
            Run ingestion →
          </Link>
        </div>
      )}

>>>>>>> f3759bd (initial commit)
      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
<<<<<<< HEAD
            <h2 className="text-sm font-semibold text-gray-700">Citations Over Time</h2>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="12m">Last 12 months</option>
              <option value="24m">Last 24 months</option>
              <option value="5y">Last 5 years</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="citations"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
=======
            <h2 className="text-sm font-semibold text-gray-700">Government Citations by Year</h2>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1" style={{ fontFamily: "'Source Sans 3', sans-serif" }}
            >
              <option value="1y">YTD</option>
              <option value="5y">Last 5 years</option>
              <option value="10y">Last 10 years</option>
              <option value="all">All time</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, cursor: 'pointer', fill: '#374151' }}
                onClick={(e: { value?: string | number }) =>
                  e?.value != null && navigate(`/citations?year_gov=${e.value}`)
                }
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(153,0,0,0.06)' }} />
              <Bar
                dataKey="citations"
                fill="#990000"
                radius={[3, 3, 0, 0]}
                cursor="pointer"
                onClick={(d: { year?: string | number }) =>
                  d?.year != null && navigate(`/citations?year_gov=${d.year}`)
                }
              />
            </BarChart>
>>>>>>> f3759bd (initial commit)
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Most Cited Faculty</h2>
          {(stats?.top_faculty?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 mt-10 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats?.top_faculty?.slice(0, 8)}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
<<<<<<< HEAD
                <YAxis type="category" dataKey="faculty" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 3, 3, 0]} />
=======
                <YAxis
                  type="category"
                  dataKey="faculty"
                  width={130}
                  tick={{ fontSize: 11, cursor: 'pointer', fill: '#374151' }}
                  onClick={(e: { value?: string }) =>
                    e?.value && navigate(`/citations?faculty=${encodeURIComponent(e.value)}`)
                  }
                />
                <Tooltip cursor={{ fill: 'rgba(153,0,0,0.06)' }} />
                <Bar
                  dataKey="count"
                  fill="#990000"
                  radius={[0, 3, 3, 0]}
                  cursor="pointer"
                  onClick={(d: { faculty?: string }) =>
                    d?.faculty && navigate(`/citations?faculty=${encodeURIComponent(d.faculty)}`)
                  }
                />
>>>>>>> f3759bd (initial commit)
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Citations</h2>
        {(stats?.recent_citations?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400">No citations recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats?.recent_citations.map(c => (
<<<<<<< HEAD
              <div key={c.id} className="py-2.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900">{c.faculty}</span>
                  <span className="text-gray-400 text-sm"> cited in </span>
                  <span className="text-sm text-gray-700 truncate">
=======
              <Link key={c.id} to={`/citations/${c.id}`} className="py-2.5 flex items-start justify-between gap-4 hover:bg-gray-50 -mx-5 px-5 transition-colors cursor-pointer block">
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900">{c.faculty}</span>
                  <span className="text-gray-400 text-sm"> cited in </span>
                  <span className="text-sm text-gray-700">
>>>>>>> f3759bd (initial commit)
                    {c.cited_in || 'Untitled document'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{c.publisher}</span>
                  <span className="text-xs text-gray-300">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </span>
<<<<<<< HEAD
                </div>
              </div>
=======
                  {c.link && (
                    <a
                      href={buildHighlightedUrl(c.link, c.faculty)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        openCitationLink(c.link!, c.faculty).then(({ isPdf }) => {
                          if (isPdf) toast('\ud83d\udccb "' + c.faculty + '" copied \u2014 press Ctrl+F in the PDF', { duration: 4000, icon: '\ud83d\udd0d' })
                        })
                      }}
                      className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline"
                      title="View source document"
                    >
                      ↗
                    </a>
                  )}
                </div>
              </Link>
>>>>>>> f3759bd (initial commit)
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

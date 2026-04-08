import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { statsApi } from '../api/client'
import type { OverviewStats } from '../types'
import { format } from 'date-fns'

function StatCard({
  label, value, sub, color,
}: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${color} p-5`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1 text-gray-900">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<{ month: string; citations: number }[]>([])
  const [period, setPeriod] = useState('12m')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([statsApi.overview(), statsApi.citationsOverTime(period)])
      .then(([s, t]) => {
        setStats(s.data)
        const { labels, data } = t.data
        setTimeSeries(labels.map((l: string, i: number) => ({ month: l, citations: data[i] })))
      })
      .finally(() => setLoading(false))
  }, [period])

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Citations" value={stats?.total_citations ?? 0} color="border-blue-500" />
        <StatCard
          label="Pending Review"
          value={stats?.pending_review ?? 0}
          sub="Awaiting confirmation"
          color="border-amber-400"
        />
        <StatCard label="People Tracked" value={stats?.total_people ?? 0} color="border-emerald-500" />
        <StatCard label="Active Sources" value={stats?.total_sources ?? 0} color="border-violet-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
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
                <YAxis type="category" dataKey="faculty" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 3, 3, 0]} />
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
              <div key={c.id} className="py-2.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900">{c.faculty}</span>
                  <span className="text-gray-400 text-sm"> cited in </span>
                  <span className="text-sm text-gray-700 truncate">
                    {c.cited_in || 'Untitled document'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{c.publisher}</span>
                  <span className="text-xs text-gray-300">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

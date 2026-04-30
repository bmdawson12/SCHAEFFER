import axios from 'axios'

// In Docker, nginx proxies /api to backend. For local dev, vite.config.ts proxies it.
export const api = axios.create({ baseURL: '' })

// ── Citations ─────────────────────────────────────────────────────────────────

export const citationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/citations/', { params }),
  get: (id: number) => api.get(`/api/citations/${id}`),
  create: (data: unknown) => api.post('/api/citations/', data),
  update: (id: number, data: unknown) => api.put(`/api/citations/${id}`, data),
  delete: (id: number) => api.delete(`/api/citations/${id}`),
  exportUrl: (params?: Record<string, unknown>) => {
    const sp = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
    return `/api/citations/export?${sp.toString()}`
  },
}

// ── Review Queue ──────────────────────────────────────────────────────────────

export const reviewQueueApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/review-queue/', { params }),
  get: (id: number) => api.get(`/api/review-queue/${id}`),
  update: (id: number, data: unknown) =>
    api.put(`/api/review-queue/${id}`, data),
  approve: (id: number) => api.post(`/api/review-queue/${id}/approve`),
  reject: (id: number) => api.post(`/api/review-queue/${id}/reject`),
}

// ── People ────────────────────────────────────────────────────────────────────

export const peopleApi = {
  list: () => api.get('/api/people/'),
  create: (data: unknown) => api.post('/api/people/', data),
  update: (id: number, data: unknown) => api.put(`/api/people/${id}`, data),
  delete: (id: number) => api.delete(`/api/people/${id}`),
  importCSV: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/people/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Sources ───────────────────────────────────────────────────────────────────

export const sourcesApi = {
  list: () => api.get('/api/sources/'),
  create: (data: unknown) => api.post('/api/sources/', data),
  update: (id: number, data: unknown) => api.put(`/api/sources/${id}`, data),
  delete: (id: number) => api.delete(`/api/sources/${id}`),
  toggle: (id: number) => api.post(`/api/sources/${id}/toggle`),
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export const statsApi = {
  overview: () => api.get('/api/stats/overview'),
  citationsOverTime: (period?: string) =>
    api.get('/api/stats/citations-over-time', { params: { period } }),
  filterOptions: () => api.get('/api/stats/filter-options'),
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

<<<<<<< HEAD
=======
// ── Database IO ──────────────────────────────────────────────────────────────

export const databaseApi = {
  exportUrl: () => '/api/export-db',
  importDb: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/import-db', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

>>>>>>> f3759bd (initial commit)
export const ingestionApi = {
  run: (sourceIds?: number[]) =>
    api.post('/api/ingestion/run', { source_ids: sourceIds ?? null }),
  logs: () => api.get('/api/ingestion/logs'),
  status: () => api.get('/api/ingestion/status'),
}
<<<<<<< HEAD
=======

// ── Intelligence ─────────────────────────────────────────────────────────────

export const intelligenceApi = {
  report: () => api.get('/api/intelligence/report'),
  sourceScores: () => api.get('/api/intelligence/source-scores'),
  gaps: () => api.get('/api/intelligence/gaps'),
  addSuggested: (domain: string, name?: string) =>
    api.post('/api/intelligence/add-suggested-source', null, { params: { domain, name } }),
}
>>>>>>> f3759bd (initial commit)

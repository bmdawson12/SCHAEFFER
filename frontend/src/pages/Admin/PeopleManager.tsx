import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { peopleApi } from '../../api/client'
import type { Person } from '../../types'

const BLANK = { full_name: '', title: '', role: '', department: '', name_variations_raw: '' }

export default function PeopleManager() {
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    peopleApi.list().then(r => setPeople(r.data))
  }

  useEffect(() => { load() }, [])

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function startEdit(p: Person) {
    setEditingId(p.id)
    setForm({
      full_name: p.full_name,
      title: p.title ?? '',
      role: p.role ?? '',
      department: p.department ?? '',
      name_variations_raw: (p.name_variations ?? []).join('; '),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(BLANK)
  }

  async function save() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    const payload = {
      full_name: form.full_name.trim(),
      title: form.title.trim() || null,
      role: form.role.trim() || null,
      department: form.department.trim() || null,
      name_variations: form.name_variations_raw
        .split(';')
        .map(v => v.trim())
        .filter(Boolean),
    }
    try {
      if (editingId) {
        await peopleApi.update(editingId, payload)
        toast.success('Updated')
      } else {
        await peopleApi.create(payload)
        toast.success('Added')
      }
      cancelEdit()
      load()
    } catch {
      toast.error('Failed to save')
    }
  }

  async function deletePerson(id: number, name: string) {
    if (!confirm(`Remove "${name}" from tracking?`)) return
    try {
      await peopleApi.delete(id)
      toast.success('Removed')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const r = await peopleApi.importCSV(file)
      toast.success(`Imported ${r.data.created} people (${r.data.skipped} skipped)`)
      load()
    } catch {
      toast.error('Import failed')
    }
    e.target.value = ''
  }

  const filtered = people.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.department ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const inp = 'w-full border border-gray-200 rounded px-3 py-1.5 text-sm'

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          People <span className="text-gray-400 text-base font-normal">({people.length})</span>
        </h1>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSV}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50"
          >
            Import CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        CSV columns: <code>full_name</code>, <code>title</code>, <code>role</code>,{' '}
        <code>department</code>, <code>name_variations</code> (semicolon-separated)
      </p>

      {/* Add / edit form */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {editingId ? 'Edit Person' : 'Add Person'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
            <input className={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Dr." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <input className={inp} value={form.role} onChange={e => set('role', e.target.value)} placeholder="Senior Fellow" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
            <input className={inp} value={form.department} onChange={e => set('department', e.target.value)} placeholder="Health Policy" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Name Variations <span className="text-gray-300 font-normal">(semicolon-separated)</span>
            </label>
            <input
              className={inp}
              value={form.name_variations_raw}
              onChange={e => set('name_variations_raw', e.target.value)}
              placeholder="J. Smith; Jane M. Smith; Smith, Jane"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">
            {editingId ? 'Update' : 'Add Person'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="text-sm px-4 py-1.5 rounded border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search + list */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            className="w-full max-w-sm border border-gray-200 rounded px-3 py-1.5 text-sm"
            placeholder="Search by name or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Name', 'Title', 'Role', 'Department', 'Variations', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No people found.</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 ${!p.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 font-medium">{p.full_name}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.title || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.role || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.department || '—'}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[200px] truncate">
                  {p.name_variations?.join('; ') || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deletePerson(p.id, p.full_name)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

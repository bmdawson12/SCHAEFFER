import { useState } from 'react'
import toast from 'react-hot-toast'
import { citationsApi } from '../../api/client'

const INITIAL = {
  short_research_tag: '',
  citation_type: '',
  title_of_paper: '',
  publication_cited: '',
  year_of_publication_cited: '',
  faculty: '',
  cited_in: '',
  year_of_government_publication: '',
  publisher: '',
  link: '',
  policy_area: '',
  notes: '',
}

const CITATION_TYPES = [
  'Journal Article', 'Working Paper', 'Report', 'Book', 'Book Chapter',
  'Policy Brief', 'Testimony', 'White Paper', 'Conference Paper', 'Other',
]

const POLICY_AREAS = [
  'Health Care', 'Tax Policy', 'Drug Pricing', 'Medicare', 'Medicaid',
  'Social Security', 'Housing', 'Education', 'Climate / Energy',
  'Financial Regulation', 'Labor', 'Trade', 'Budget / Fiscal',
  'Prescription Drugs', 'Insurance', 'Other',
]

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function ManualEntry() {
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.faculty.trim()) {
      toast.error('Faculty name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        year_of_publication_cited: form.year_of_publication_cited
          ? Number(form.year_of_publication_cited)
          : null,
        year_of_government_publication: form.year_of_government_publication
          ? Number(form.year_of_government_publication)
          : null,
      }
      await citationsApi.create(payload)
      toast.success('Citation saved successfully')
      setForm(INITIAL)
    } catch {
      toast.error('Failed to save citation')
    } finally {
      setSaving(false)
    }
  }

<<<<<<< HEAD
  const inp = 'w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400'
=======
  const inp = 'w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#990000]/20'
>>>>>>> f3759bd (initial commit)

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">New Citation</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Faculty / Staff Name" required>
            <input
              className={inp}
              value={form.faculty}
              onChange={e => set('faculty', e.target.value)}
              placeholder="e.g. Jane Smith"
            />
          </Field>

          <Field label="Short Research Tag">
            <input
              className={inp}
              value={form.short_research_tag}
              onChange={e => set('short_research_tag', e.target.value)}
              placeholder="e.g. Smith2022DrugPricing"
            />
          </Field>

          <Field label="Type of Cited Work">
            <select className={inp} value={form.citation_type} onChange={e => set('citation_type', e.target.value)}>
              <option value="">Select type…</option>
              {CITATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Policy Area">
            <select className={inp} value={form.policy_area} onChange={e => set('policy_area', e.target.value)}>
              <option value="">Select area…</option>
              {POLICY_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Title of Paper (Staff's Work)">
          <input
            className={inp}
            value={form.title_of_paper}
            onChange={e => set('title_of_paper', e.target.value)}
            placeholder="Full title of the staff member's cited work"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Publication Cited (Original Outlet)">
            <input
              className={inp}
              value={form.publication_cited}
              onChange={e => set('publication_cited', e.target.value)}
              placeholder="e.g. Journal of Health Economics"
            />
          </Field>

          <Field label="Year of Publication Cited">
            <input
              type="number"
              className={inp}
              value={form.year_of_publication_cited}
              onChange={e => set('year_of_publication_cited', e.target.value)}
              placeholder="e.g. 2021"
              min={1900}
              max={2100}
            />
          </Field>
        </div>

        <hr className="border-gray-100" />

        <Field label="Cited In (Government Document Title)">
          <input
            className={inp}
            value={form.cited_in}
            onChange={e => set('cited_in', e.target.value)}
            placeholder="Title of the government report / hearing / document"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Publisher (Agency / Body)">
            <input
              className={inp}
              value={form.publisher}
              onChange={e => set('publisher', e.target.value)}
              placeholder="e.g. Congressional Budget Office"
            />
          </Field>

          <Field label="Year of Government Publication">
            <input
              type="number"
              className={inp}
              value={form.year_of_government_publication}
              onChange={e => set('year_of_government_publication', e.target.value)}
              placeholder="e.g. 2023"
              min={1900}
              max={2100}
            />
          </Field>
        </div>

        <Field label="Link (URL to Government Document)">
          <input
            type="url"
            className={inp}
            value={form.link}
            onChange={e => set('link', e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Notes">
          <textarea
            className={inp}
            rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any additional context…"
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
<<<<<<< HEAD
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
=======
            className="bg-[#990000] text-white px-5 py-2 rounded text-sm hover:bg-[#7a0000] disabled:opacity-50"
>>>>>>> f3759bd (initial commit)
          >
            {saving ? 'Saving…' : 'Save Citation'}
          </button>
        </div>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { fileComplaint } from '../../services/api'

export default function Complaint() {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', semester: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function onChange(e){
    const { name, value } = e.target
    setForm((f)=>({ ...f, [name]: value }))
  }

  async function onSubmit(e){
    e.preventDefault()
    setMsg(''); setErr(''); setLoading(true)
    try {
      const res = await fileComplaint(form)
      setMsg(res?.message || 'Complaint submitted')
      setForm({ title: '', description: '', category: 'general', semester: '' })
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to submit complaint')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">File Complaint</h3>
      <p className="text-sm text-gray-600">Raise an issue related to hostel facilities.</p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">Category</label>
          <select name="category" value={form.category} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm">
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="mess">Mess</option>
            <option value="security">Security</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Description</label>
          <textarea name="description" value={form.description} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" rows="4" required />
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input name="semester" value={form.semester} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" placeholder="e.g., 3" required />
        </div>
        <button disabled={loading} className="w-full rounded bg-gray-900 text-white py-2 text-sm disabled:opacity-50">{loading?'Submitting...':'Submit Complaint'}</button>
      </form>
    </div>
  )
}



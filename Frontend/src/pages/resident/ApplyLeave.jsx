import { useState } from 'react'
import { applyLeave } from '../../services/api'

export default function ApplyLeave() {
  const [form, setForm] = useState({ fromDate: '', toDate: '', reason: '', destination: '', contactNo: '', semester: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function onChange(e) {
    const { name, value } = e.target
    setForm((f)=>({ ...f, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setMsg(''); setErr(''); setLoading(true)
    try {
      const res = await applyLeave(form)
      setMsg(res?.message || 'Leave submitted')
      setForm({ fromDate: '', toDate: '', reason: '', destination: '', contactNo: '', semester: '' })
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to submit leave')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Apply Leave</h3>
      <p className="text-sm text-gray-600">Fill details to submit a leave application.</p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm">From date</label>
          <input type="date" name="fromDate" value={form.fromDate} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">To date</label>
          <input type="date" name="toDate" value={form.toDate} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">Reason</label>
          <input name="reason" value={form.reason} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Destination</label>
            <input name="destination" value={form.destination} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm">Contact No</label>
            <input name="contactNo" value={form.contactNo} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input name="semester" value={form.semester} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" placeholder="e.g., 3" required />
        </div>
        <button disabled={loading} className="w-full rounded bg-gray-900 text-white py-2 text-sm disabled:opacity-50">{loading?'Submitting...':'Submit Leave'}</button>
      </form>
    </div>
  )
}



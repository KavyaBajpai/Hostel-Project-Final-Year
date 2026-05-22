import { useState } from 'react'
import { registerOptOut } from '../../services/api'

export default function MealOptOut() {
  const [form, setForm] = useState({ fromDate: '', toDate: '', breakfast: false, lunch: false, snacks: false, dinner: false, semester: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function onChange(e){
    const { name, type, checked, value } = e.target
    setForm((f)=>({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function onSubmit(e){
    e.preventDefault()
    setMsg(''); setErr(''); setLoading(true)
    try {
      const res = await registerOptOut(form)
      setMsg(res?.message || 'Meal opt-out registered')
      setForm({ fromDate: '', toDate: '', breakfast: false, lunch: false, snacks: false, dinner: false, semester: '' })
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to register opt-out')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Meal Opt-Out</h3>
      <p className="text-sm text-gray-600">Specify dates and meals to opt-out.</p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">From date</label>
            <input type="date" name="fromDate" value={form.fromDate} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm">To date</label>
            <input type="date" name="toDate" value={form.toDate} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="breakfast" checked={form.breakfast} onChange={onChange} />Breakfast</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lunch" checked={form.lunch} onChange={onChange} />Lunch</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="snacks" checked={form.snacks} onChange={onChange} />Snacks</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="dinner" checked={form.dinner} onChange={onChange} />Dinner</label>
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input name="semester" value={form.semester} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <button disabled={loading} className="w-full rounded bg-gray-900 text-white py-2 text-sm disabled:opacity-50">{loading?'Submitting...':'Submit'}</button>
      </form>
    </div>
  )
}



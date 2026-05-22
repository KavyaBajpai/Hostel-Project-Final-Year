import { useState } from 'react'
import { getMyComplaints } from '../../services/api'

export default function ViewComplaints() {
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchComplaints(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await getMyComplaints({ semester, status: status || undefined })
      setRows(data?.complaints || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch complaints')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">My Complaints</h3>
      <form onSubmit={fetchComplaints} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Semester</label>
          <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="3" className="border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In-progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
      </form>

      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">{r.title}</td>
                <td className="py-2 pr-4">{r.category}</td>
                <td className="py-2 pr-4">{r.status}</td>
                <td className="py-2 pr-4">{r.createdAt}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="py-3 text-gray-500" colSpan="4">No complaints</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



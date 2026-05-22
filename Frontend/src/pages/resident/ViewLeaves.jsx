import { useState } from 'react'
import { getMyLeaves } from '../../services/api'

function statusBadge(status) {
  const s = (status || 'pending').toLowerCase()
  const styles = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[s] || 'bg-gray-100 text-gray-800'}`}>
      {s}
    </span>
  )
}

export default function ViewLeaves() {
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchLeaves(e) {
    e?.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await getMyLeaves({ semester, status: status || undefined })
      setRows(data?.leaves || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch leave applications')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">My Leave Applications</h3>
      <p className="mt-1 text-sm text-gray-600">Track pending, approved, and rejected leave requests.</p>

      <form onSubmit={fetchLeaves} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Semester</label>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="3"
            className="border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </form>

      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">From</th>
              <th className="py-2 pr-4">To</th>
              <th className="py-2 pr-4">Destination</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">{r.fromDate}</td>
                <td className="py-2 pr-4">{r.toDate}</td>
                <td className="py-2 pr-4">{r.destination}</td>
                <td className="py-2 pr-4 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                <td className="py-2 pr-4">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-3 text-gray-500" colSpan="5">
                  No leave applications found for this semester.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

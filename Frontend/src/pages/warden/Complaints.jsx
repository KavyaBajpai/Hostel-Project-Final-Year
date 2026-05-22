import { useState } from 'react'
import { listComplaints } from '../../services/api'

export default function Complaints() {
  const [session, setSession] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchComplaints(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await listComplaints({ session, semester, status })
      setRows(data?.complaints || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch complaints')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Complaints</h3>
      <form onSubmit={fetchComplaints} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Session</label>
          <input value={session} onChange={(e)=>setSession(e.target.value)} placeholder="2024-25" className="border rounded px-3 py-2 text-sm" required />
        </div>
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

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-700">Title</th>
              <th className="px-3 py-2 font-medium text-gray-700">Category</th>
              <th className="px-3 py-2 font-medium text-gray-700">Student</th>
              <th className="px-3 py-2 font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-left break-words">{r.title}</td>
                <td className="px-3 py-2 text-left break-words">{r.category}</td>
                <td className="px-3 py-2 text-left break-words">{r.studentName}</td>
                <td className="px-3 py-2 text-left break-words">{r.email}</td>
                <td className="px-3 py-2 text-left capitalize">{r.status}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-3 py-4 text-left text-gray-500" colSpan="5">No complaints</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



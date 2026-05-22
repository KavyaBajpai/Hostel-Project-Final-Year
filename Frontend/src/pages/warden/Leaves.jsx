import { useState } from 'react'
import { listLeaves, approveLeave, rejectLeave } from '../../services/api'

export default function Leaves() {
  const [session, setSession] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchLeaves(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await listLeaves({ session, semester, status })
      setRows(data?.leaves || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch leaves')
    } finally { setLoading(false) }
  }

  async function onApprove(id){
    try {
      await approveLeave(id)
      await fetchLeaves()
    } catch {}
  }

  async function onReject(id){
    try {
      await rejectLeave(id)
      await fetchLeaves()
    } catch {}
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Leave Applications</h3>
      <form onSubmit={fetchLeaves} className="mt-4 flex flex-wrap gap-2 items-end">
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
      </form>

      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[22%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[22%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-700">Student</th>
              <th className="px-3 py-2 font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 font-medium text-gray-700">From</th>
              <th className="px-3 py-2 font-medium text-gray-700">To</th>
              <th className="px-3 py-2 font-medium text-gray-700">Reason</th>
              <th className="px-3 py-2 font-medium text-gray-700">Status</th>
              <th className="px-3 py-2 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-left">{r.studentName}</td>
                <td className="px-3 py-2 text-left break-words">{r.email}</td>
                <td className="px-3 py-2 text-left whitespace-nowrap">{r.fromDate}</td>
                <td className="px-3 py-2 text-left whitespace-nowrap">{r.toDate}</td>
                <td className="px-3 py-2 text-left break-words">{r.reason}</td>
                <td className="px-3 py-2 text-left capitalize">{r.status}</td>
                <td className="px-3 py-2 text-left">
                 { r.status==='pending' && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={()=>onApprove(r.id)} className="px-2 py-1 rounded border text-xs hover:bg-gray-700 hover:text-white">Approve</button>
                    <button type="button" onClick={()=>onReject(r.id)} className="px-2 py-1 rounded border text-xs  hover:bg-gray-700 hover:text-white">Reject</button>
                  </div>
                 )
                 }
                 {
                  r.status!='pending' && (
                    <span className="text-xs text-gray-500">No actions</span>
                  )
                 }
                  
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-3 py-4 text-left text-gray-500" colSpan="7">No applications</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



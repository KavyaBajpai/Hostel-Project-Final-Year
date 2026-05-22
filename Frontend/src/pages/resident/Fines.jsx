import { useState } from 'react'
import { getFines } from '../../services/api'

export default function Fines() {
  const [semester, setSemester] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchFines(e) {
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await getFines(semester)
      console.log(data)
      setRows(data?.fines || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch fines')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">My Fines</h3>
      <form onSubmit={fetchFines} className="mt-4 flex gap-2">
        <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="Semester" className="border rounded px-3 py-2 text-sm" required />
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
      </form>
      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i)=> (
              <tr key={i} className="border-b">
                <td className="py-2 pr-4">{r.date}</td>
                <td className="py-2 pr-4">{r.reason}</td>
                <td className="py-2 pr-4">₹{r.amount}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="py-3 text-gray-500" colSpan="3">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



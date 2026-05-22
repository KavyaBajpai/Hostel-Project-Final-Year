import { useState } from 'react'
import { getBills } from '../../services/api'

export default function Bills() {
  const [semester, setSemester] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchBills(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await getBills(semester)
      setRows(data?.bills || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch bills')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Mess Bills</h3>
      <form onSubmit={fetchBills} className="mt-4 flex gap-2">
        <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="Semester" className="border rounded px-3 py-2 text-sm" required />
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
      </form>
      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Used</th>
              <th className="py-2 pr-4">Offs</th>
              <th className="py-2 pr-4">Extra</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i)=> (
              <tr key={i} className="border-b">
                <td className="py-2 pr-4">₹{r.paid}</td>
                <td className="py-2 pr-4">₹{r.used}</td>
                <td className="py-2 pr-4">₹{r.offs}</td>
                <td className="py-2 pr-4">₹{r.extra}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="py-3 text-gray-500" colSpan="4">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



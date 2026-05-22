import { useState } from 'react'
import { getOptOuts } from '../../services/api'

export default function ViewOptOuts() {
  const [semester, setSemester] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchOptOuts(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await getOptOuts(semester)
      setRows(data?.optOuts || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">My Meal Opt-Outs</h3>
      <form onSubmit={fetchOptOuts} className="mt-4 flex gap-2 items-end">
        <div>
          <label className="block text-sm">Semester</label>
          <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="3" className="border rounded px-3 py-2 text-sm" required />
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
      </form>
      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">From</th>
              <th className="py-2 pr-4">To</th>
              <th className="py-2 pr-4">Breakfast</th>
              <th className="py-2 pr-4">Lunch</th>
              <th className="py-2 pr-4">Snacks</th>
              <th className="py-2 pr-4">Dinner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">{r.fromDate}</td>
                <td className="py-2 pr-4">{r.toDate}</td>
                <td className="py-2 pr-4">{r.breakfast ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{r.lunch ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{r.snacks ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{r.dinner ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="py-3 text-gray-500" colSpan="6">No entries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



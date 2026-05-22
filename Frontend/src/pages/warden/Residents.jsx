// import { useState } from 'react'
// import { listResidents } from '../../services/api'

// export default function Residents() {
//   const [session, setSession] = useState('')
//   const [semester, setSemester] = useState('')
//   const [rows, setRows] = useState([])
//   const [err, setErr] = useState('')
//   const [loading, setLoading] = useState(false)

//   async function fetchResidents(e){
//     e?.preventDefault()
//     setErr(''); setLoading(true)
//     try {
//       const data = await listResidents({ session, semester })
//       setRows(data?.students || [])
//     } catch (e) {
//       setErr(e?.response?.data?.message || 'Failed to fetch residents')
//     } finally { setLoading(false) }
//   }

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-8">
//       <h3 className="text-xl font-semibold text-gray-900">Residents</h3>
//       <form onSubmit={fetchResidents} className="mt-4 flex flex-wrap gap-2 items-end">
//         <div>
//           <label className="block text-sm">Session</label>
//           <input value={session} onChange={(e)=>setSession(e.target.value)} placeholder="2024-25" className="border rounded px-3 py-2 text-sm" required />
//         </div>
//         <div>
//           <label className="block text-sm">Semester</label>
//           <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="3" className="border rounded px-3 py-2 text-sm" required />
//         </div>
//         <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>{loading?'Loading...':'Fetch'}</button>
//       </form>

//       {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

//       <div className="mt-6 overflow-auto">
//         <table className="min-w-full text-sm">
//           <thead>
//             <tr className="text-left border-b">
//               <th className="py-2 pr-4">Name</th>
//               <th className="py-2 pr-4">Email</th>
//               <th className="py-2 pr-4">Batch</th>
//               <th className="py-2 pr-4">Branch</th>
//               <th className="py-2 pr-4">Phone</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((r)=> (
//               <tr key={r.id} className="border-b">
//                 <td className="py-2 pr-4">{r.name}</td>
//                 <td className="py-2 pr-4">{r.email}</td>
//                 <td className="py-2 pr-4">{r.batch}</td>
//                 <td className="py-2 pr-4">{r.branch}</td>
//                 <td className="py-2 pr-4">{r.phone}</td>
//               </tr>
//             ))}
//             {rows.length===0 && (
//               <tr><td className="py-3 text-gray-500" colSpan="5">No residents</td></tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   )
// }

import { useState } from 'react'
import { listResidents } from '../../services/api'

export default function Residents() {
  const [session, setSession] = useState('')
  const [semester, setSemester] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedResident, setSelectedResident] = useState(null) // For modal

  async function fetchResidents(e){
    e?.preventDefault()
    setErr(''); setLoading(true)
    try {
      const data = await listResidents({ session, semester })
      setRows(data?.students || [])
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to fetch residents')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Residents</h3>
      <form onSubmit={fetchResidents} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Session</label>
          <input value={session} onChange={(e)=>setSession(e.target.value)} placeholder="2024-25" className="border rounded px-3 py-2 text-sm" required />
        </div>
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
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Batch</th>
              <th className="py-2 pr-4">Branch</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.batch}</td>
                <td className="py-2 pr-4">{r.branch}</td>
                <td className="py-2 pr-4">{r.phone}</td>
                <td className="py-2 pr-4">
                  <button 
                    className="px-3 py-1 text-sm rounded bg-gray-900 text-white"
                    onClick={() => setSelectedResident(r)}
                  >
                    View More
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="py-3 text-gray-500" colSpan="6">No residents</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded max-w-md w-full relative">
            <h4 className="text-lg font-semibold mb-4">{selectedResident.name}</h4>
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" 
              onClick={() => setSelectedResident(null)}
            >
              ✕
            </button>
            <div className="space-y-2 text-sm">
              {Object.entries(selectedResident).map(([key, value]) => (
                <div key={key}><strong>{key}:</strong> {value?.toString()}</div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}



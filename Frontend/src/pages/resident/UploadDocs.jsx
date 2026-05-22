import { useState } from 'react'
import { uploadResidentDoc } from '../../services/api'

export default function UploadDocs() {
  const [docType, setDocType] = useState('Aadhaar')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setMsg(''); setErr('')
    if (!file) { setErr('Please choose a file'); return }
    setLoading(true)
    try {
      const res = await uploadResidentDoc({ docType, semester, file })
      setMsg(res?.message || 'Uploaded successfully')
      setDocType('Aadhaar'); setSemester(''); setFile(null)
      e.target.reset()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Upload Document</h3>
      <p className="text-sm text-gray-600">Upload required documents (PDF/JPG/PNG).</p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm">Document Type</label>
          <select value={docType} onChange={(e)=>setDocType(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm">
            <option>Aadhaar</option>
            <option>Guardian Consent</option>
            <option>Fee Receipt</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input value={semester} onChange={(e)=>setSemester(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">File</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="mt-1 w-full text-sm" required />
        </div>
        <button disabled={loading} className="w-full rounded bg-gray-900 text-white py-2 text-sm disabled:opacity-50">{loading?'Uploading...':'Upload'}</button>
      </form>
    </div>
  )
}



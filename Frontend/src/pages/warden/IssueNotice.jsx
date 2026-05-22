import { useState } from 'react'
import { issueNotice } from '../../services/api'

export default function IssueNotice() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [session, setSession] = useState('')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setMsg(''); setErr(''); setLoading(true)
    try {
      const res = await issueNotice({ title, body, session, semester, file })
      setMsg(res?.message || 'Notice issued')
      setTitle(''); setBody(''); setSession(''); setSemester(''); setFile(null)
      e.target.reset()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to issue notice')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Issue Notice</h3>
      <p className="text-sm text-gray-600">Optionally attach a file (PDF/JPG/PNG).</p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm">Title</label>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">Body</label>
          <textarea value={body} onChange={(e)=>setBody(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" rows="5" required />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Session</label>
            <input value={session} onChange={(e)=>setSession(e.target.value)} placeholder="2025-26" className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm">Semester</label>
            <input value={semester} onChange={(e)=>setSemester(e.target.value)} placeholder="3" className="mt-1 w-full border rounded px-3 py-2 text-sm" required />
          </div>
        </div>
        <div>
          <label className="block text-sm">File</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="mt-1 w-full text-sm" />
        </div>
        <button disabled={loading} className="w-full rounded bg-gray-900 text-white py-2 text-sm disabled:opacity-50">{loading?'Publishing...':'Publish Notice'}</button>
      </form>
    </div>
  )
}



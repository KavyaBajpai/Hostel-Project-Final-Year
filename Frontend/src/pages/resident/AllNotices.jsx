import { useEffect, useState } from "react"
import { listNotices } from "../../services/api.js"

export default function AllNotices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await listNotices()
        setNotices(res?.notices || [])
      } catch (e) {
        setErr("Failed to fetch notices")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4"> All Notices</h2>

      {loading && <p className="text-gray-500">Loading...</p>}
      {err && <p className="text-red-500">{err}</p>}

      <div className="space-y-3">
        {notices.length === 0 && (
          <p className="text-gray-500">No notices available</p>
        )}
        {notices.map((n) => (
          <div key={n.id} className="p-3 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center">
              <div className="ml-4 space-y-1 text-left">
                <p className="font-medium">{n.title}</p>
                <p className="text-gray-600 text-sm">{n.body}</p>
                <p className="text-gray-400 text-xs">
                  {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </div>

              {n.fileUrl && (
                <a
                  href={n.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:underline"
                >
                  Open
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

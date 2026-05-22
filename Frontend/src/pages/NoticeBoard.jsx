import { useEffect, useState } from "react"
import { listNotices, getMessMenu } from "../services/api.js" 
import { useNavigate } from "react-router-dom"

export default function NoticeBoard() {
  const [notices, setNotices] = useState([])
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const [nData, mData] = await Promise.all([
          listNotices(),
          getMessMenu()
        ])
        setNotices(nData?.notices || [])
        setMenu(mData?.menu || null)
      } catch (e) {
        setErr("Failed to load notice board")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="mt-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-200 shadow rounded-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 cursor-pointer"
             onClick={() => setOpen(!open)}>
          <h2 className="text-base font-bold text-gray-800"> Notice Board</h2>
          <button className="text-sm text-blue-600 hover:underline">
            {open ? "Hide" : "Show"}
          </button>
        </div>

        {/* Collapsible Content */}
        {open && (
          <div className="px-4 pb-4">
            {loading && <p className="text-gray-500 text-sm">Loading...</p>}
            {err && <p className="text-gray-700 text-sm">{err}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Notices */}
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Recent Notices</h3>
                <div className="space-y-2">
                  {notices.length === 0 && (
                    <p className="text-xs text-gray-500">No notices available</p>
                  )}
                  {notices.slice(0, 2).map((n) => (
                    <div key={n.id} className="bg-white rounded p-2 shadow-sm border text-xs">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-gray-600">{n.description}</p>
                      <p className="text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {notices.length > 0 && (
                    <button 
                      className="text-blue-600 text-xs mt-1 hover:underline"
                      onClick={() => navigate("/resident/notices")}
                    >
                      Show more
                    </button>
                  )}
                </div>
              </div>

              {/* Mess Menu */}
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Current Mess Menu</h3>
                {menu ? (
                  <table className="w-full text-xs border rounded overflow-hidden">
                    <thead className="bg-yellow-100">
                      <tr>
                        <th className="p-1 border">Meal</th>
                        <th className="p-1 border">Menu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menu.map((m, i) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="p-1 border font-medium">{m.meal}</td>
                          <td className="p-1 border">{m.items.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-500">No menu uploaded</p>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

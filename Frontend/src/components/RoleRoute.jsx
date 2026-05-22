import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ allow, children }) {
  const { user } = useAuth() || {}
  if (!user) return <Navigate to="/login" replace />
  if (Array.isArray(allow)) {
    if (!allow.includes(user.role)) return <Navigate to="/" replace />
  } else if (allow && user.role !== allow) {
    return <Navigate to="/" replace />
  }
  return children
}



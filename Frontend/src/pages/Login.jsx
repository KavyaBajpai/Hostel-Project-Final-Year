import { useState } from 'react'
import { login as loginApi, setAuthToken } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login: setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginApi(email, password)
      console.log(data)
      const token = data?.user?.token
      if (token) {
        localStorage.setItem('token', token)
        setAuthToken(token)
      }
      // Save user and redirect by role
      if (data?.user) setUser({ ...data.user, token })
      const role = data?.user?.role
      if (role === 'resident') navigate('/resident')
      else if (role === 'warden') navigate('/warden')
      else if (role === 'mess-incharge') navigate('/mess')
      else if (role === 'admin') navigate('/admin')
      else navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold text-gray-900">Login</h2>
      <p className="mt-1 text-sm text-gray-600">Sign in to access your dashboard.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="you@example.com" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-gray-900 text-white py-2 text-sm disabled:opacity-50">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">Don’t have an account? <a className="underline" href="/register">Register</a></p>
    </div>
  )
}



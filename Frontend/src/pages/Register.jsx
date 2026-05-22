import { useState } from 'react'
import { register as registerApi, setAuthToken } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login: setUser } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'resident', hostelName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function onChange(e) {
    const { name, value } = e.target
    setForm((f)=>({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await registerApi(form)
      console.log(data)
      const token = data?.user?.token
      if (token) {
        localStorage.setItem('token', token)
        setAuthToken(token)
      }
      // Persist newly created user and redirect by role
      if (data?.user) setUser({ ...data.user, token })
      const role = data?.user?.role
      if (role === 'resident') navigate('/resident')
      else if (role === 'warden') navigate('/warden')
      else if (role === 'mess-incharge') navigate('/mess')
      else if (role === 'admin') navigate('/admin')
      else navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold text-gray-900">Register</h2>
      <p className="mt-1 text-sm text-gray-600">Create your account to access the portal.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Full name</label>
          <input name="name" value={form.name} onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input type="email" name="email" value={form.email} onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Password</label>
          <input type="password" name="password" value={form.password} onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Role</label>
          <select name="role" value={form.role} onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
            <option value="resident">Resident</option>
            <option value="warden">Warden</option>
            <option value="mess-incharge">Mess In-charge</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Hostel Name</label>
          <select name="hostelName" value={form.hostelName} onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm" required>
            <option value="">Select hostel</option>
            <option value="Sarojini Girls Hostel">Sarojini Girls Hostel</option>
            <option value="Maitriya Girls Hostel">Maitriya Girls Hostel</option>
            <option value="Apala Girls Hostel">Apala Girls Hostel</option>
          </select>
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-gray-900 text-white py-2 text-sm disabled:opacity-50">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">Already have an account? <a className="underline" href="/login">Login</a></p>
    </div>
  )
}



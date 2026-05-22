import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { setAuthToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      if (token) setAuthToken(token)
      if (userStr) setUser(JSON.parse(userStr))
    } finally {
      setReady(true)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    ready,
    login: (userData) => {
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      if (userData?.token) {
        localStorage.setItem('token', userData.token)
        setAuthToken(userData.token)
      }
    },
    logout: () => {
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      setAuthToken(null)
    }
  }), [user, ready])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  // Provide safe fallback to avoid destructuring errors if provider isn't mounted yet
  if (!ctx) {
    return {
      user: null,
      ready: true,
      login: () => {},
      logout: () => {},
    }
  }
  return ctx
}



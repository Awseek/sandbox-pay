import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { setToken, clearToken } from '../utils/api'

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({ isLoggedIn: false, loading: true, logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
    if (token) setToken(token)
    setLoading(false)
  }, [])

  const logout = () => {
    clearToken()
    localStorage.removeItem('token')
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

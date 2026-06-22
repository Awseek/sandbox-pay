import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { setToken, clearToken } from '../utils/api'

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ isLoggedIn: false, loading: true, logout: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
    if (token) setToken(token)
    setLoading(false)
  }, [])

  const logout = async () => {
    // 调用 SSO 单点登出（撤销 SSO refresh_token）
    try {
      await fetch('/v1/api/auth/sso/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // 忽略网络错误，仍然清除本地状态
    }

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

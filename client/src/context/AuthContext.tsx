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
    // 1. 已有本地 token，直接用
    const token = localStorage.getItem('token')
    if (token) {
      setToken(token)
      setIsLoggedIn(true)
      setLoading(false)
      return
    }

    // 2. 没有 token，尝试共享 cookie 无感登录
    fetch('/v1/api/auth/auto-login', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('no session')
        return res.json()
      })
      .then(data => {
        if (data.code === 200 && data.data?.token) {
          localStorage.setItem('token', data.data.token)
          setToken(data.data.token)
          setIsLoggedIn(true)
        }
      })
      .catch(() => {
        // 没有共享登录态，用户需要先在 we29.cn 登录
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try {
      await fetch('/v1/api/auth/sso/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // 忽略
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

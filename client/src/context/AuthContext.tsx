import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { setToken, clearToken } from '../utils/api'

interface AuthContextType {
  isLoggedIn: boolean
  loading: boolean
  username: string
  role: string
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  loading: true,
  username: '',
  role: '',
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // 同步从 localStorage 初始化，避免首帧 isLoggedIn=false 导致 Login 页闪"请登录"
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [loading, setLoading] = useState(() => !localStorage.getItem('token'))
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '')
  const [role, setRole] = useState(() => localStorage.getItem('role') || '')

  useEffect(() => {
    // 兼容切换前签发的本地 token
    const token = localStorage.getItem('token')
    if (token) {
      setToken(token)
      setIsLoggedIn(true)
      setLoading(false)
      return
    }

    // 新模式：读取本应用 host-only HttpOnly Cookie，不再读取跨子域共享 Cookie
    fetch('/v1/api/auth/session', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('no session')
        return res.json()
      })
      .then(payload => {
        const data = payload.data || payload
        if (data?.username) {
          localStorage.setItem('username', data.username)
          localStorage.setItem('role', data.role || '')
          setUsername(data.username)
          setRole(data.role || '')
          setIsLoggedIn(true)
        }
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch('/v1/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined)
    clearToken()
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    setUsername('')
    setRole('')
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, username, role, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

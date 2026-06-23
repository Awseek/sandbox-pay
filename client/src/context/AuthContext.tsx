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

  const applyAuth = (token: string, user: string, userRole: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', user)
    localStorage.setItem('role', userRole)
    setToken(token)
    setUsername(user)
    setRole(userRole)
    setIsLoggedIn(true)
  }

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
          applyAuth(data.data.token, data.data.username || '', data.data.role || '')
        }
      })
      .catch(() => {
        // 没有共享登录态，用户需要先在 we29.cn 登录
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
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

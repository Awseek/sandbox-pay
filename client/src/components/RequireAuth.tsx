import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * 路由级认证守卫。
 * 未登录时跳转 /login（登录入口暂未接入，Login 页显示占位提示）。
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      const returnUrl = window.location.href
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, { replace: true })
    }
  }, [loading, isLoggedIn, navigate])

  if (loading || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm mb-4 animate-pulse">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <p className="text-muted text-sm">正在识别登录态...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * 登录路由处理：
 * - 已登录 → 直接跳 redirect 目标（或 /admin），无中间页面
 * - 未登录 → 跳 SSO 登录页，带上 redirect 回调
 */
export default function Login() {
  const [searchParams] = useSearchParams()
  const { isLoggedIn, loading } = useAuth()
  const redirect = searchParams.get('redirect') || '/admin'

  useEffect(() => {
    if (loading) return

    if (isLoggedIn) {
      // 已登录，瞬间跳目标
      window.location.replace(redirect)
    } else {
      // 未登录，跳 SSO
      const loginUrl = import.meta.env.VITE_SSO_LOGIN_URL || 'https://we29.cn/login'
      const returnUrl = window.location.origin + '/login?redirect=' + encodeURIComponent(redirect)
      window.location.replace(`${loginUrl}?redirect=${encodeURIComponent(returnUrl)}`)
    }
  }, [loading, isLoggedIn, redirect])

  // loading 期间白屏，避免闪烁"请登录"
  if (loading) return null

  // 未登录且即将跳 SSO，显示极简提示
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm mb-4 animate-pulse">
          <Zap className="w-6 h-6 fill-current" />
        </div>
        <p className="text-muted text-sm">正在跳转至登录页...</p>
      </div>
    </div>
  )
}

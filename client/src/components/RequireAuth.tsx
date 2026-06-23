import { Zap, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * 路由级认证守卫。
 * 未登录时显示"请先在 we29.cn 登录"提示，不跳转。
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">未登录</h1>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            请先在 we29.cn 登录账号，然后刷新此页面。
          </p>
          <a
            href="https://we29.cn/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            前往 we29.cn 登录
          </a>
          <p className="text-muted text-xs mt-4">
            登录后返回此页面即可自动识别
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

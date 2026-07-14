import { Zap } from 'lucide-react'

/**
 * 登录路由处理：
 * 目前没有接入登录方式（SSO 已移除，尚未补充新的登录），
 * 因此这里只是一个静态提示页，告知用户登录暂不可用。
 * 保留可路由导出，供 RequireAuth 未登录时重定向到 /login 渲染。
 */
export default function Login() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm mb-4">
          <Zap className="w-6 h-6 fill-current" />
        </div>
        <p className="text-foreground text-base font-medium">登录暂不可用</p>
        <p className="text-muted text-sm mt-2">Login is currently unavailable.</p>
      </div>
    </div>
  )
}

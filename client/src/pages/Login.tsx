import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Zap, ExternalLink, ArrowLeft } from 'lucide-react'
import { Button, Card } from '@heroui/react'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 1. 处理 SSO 回调 token（从 URL hash 中读取）
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    const ssoToken = hashParams.get('sso_token')
    const ssoUsername = hashParams.get('sso_username')
    if (ssoToken && ssoUsername) {
      localStorage.setItem('token', ssoToken)
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/dashboard')
      return
    }

    // 2. 处理 SSO 错误
    const err = searchParams.get('error')
    if (err) {
      const errorMessages: Record<string, string> = {
        sso_failed: 'SSO 认证失败，请重试',
        invalid_state: '安全验证失败，请重新登录',
        sso_error: 'SSO 服务异常，请稍后重试',
        access_denied: '您拒绝了授权请求',
      }
      setError(errorMessages[err] || '登录失败，请重试')
      window.history.replaceState(null, '', window.location.pathname)
      setChecking(false)
      return
    }

    // 3. 已有本地 token，直接进后台
    const existingToken = localStorage.getItem('token')
    if (existingToken) {
      navigate('/dashboard')
      return
    }

    // 4. 尝试共享 cookie 无感登录
    fetch('/v1/api/auth/auto-login', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('no session')
        return res.json()
      })
      .then(data => {
        if (data.code === 200 && data.data?.token) {
          localStorage.setItem('token', data.data.token)
          navigate('/dashboard')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [searchParams, navigate])

  const handleSSO = () => {
    window.location.href = '/v1/api/auth/sso/login'
  }

  // 正在检查共享登录态
  if (checking) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm mb-4 animate-pulse">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <p className="text-muted text-sm">正在检查登录态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex items-center justify-center px-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-sm p-8">
        <Card.Content className="p-0">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm mb-4">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">WeiPay</h1>
            <p className="text-muted text-xs mt-1">统一支付管理平台</p>
          </div>

          {error && (
            <p className="text-rose-500 text-xs text-center font-medium bg-rose-500/10 py-2 rounded-lg border border-rose-500/20 mb-4">
              {error}
            </p>
          )}

          <Button
            onPress={handleSSO}
            className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            使用 we29.cn 账号登录
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-card text-muted">安全统一认证</span>
            </div>
          </div>

          <p className="text-center text-xs text-muted leading-relaxed">
            点击上方按钮将跳转至统一认证中心完成登录
          </p>

          <div className="pt-6 text-center">
            <Link
              to="/"
              className="text-xs text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              返回首页
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

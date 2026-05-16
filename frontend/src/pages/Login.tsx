import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Zap, ExternalLink, ArrowLeft } from 'lucide-react'

const WE29_SSO_URL = 'https://we29.cn/api/auth/sso/authorize'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  // 处理 SSO 回调
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token')
    const ssoUsername = searchParams.get('sso_username')
    if (ssoToken && ssoUsername) {
      localStorage.setItem('token', ssoToken)
      navigate('/dashboard')
    }
    const err = searchParams.get('error')
    if (err) {
      setError('SSO 登录失败，请重试')
    }
  }, [searchParams, navigate])

  // 跳转 we29.cn SSO 页面
  const handleSSO = () => {
    const redirectUri = window.location.origin + '/api/auth/sso/callback'
    const state = btoa(JSON.stringify({ app: 'pay_we29' }))
    const url = `${WE29_SSO_URL}?client_id=pay_we29&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex items-center justify-center px-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm card p-8">
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

        <button
          onClick={handleSSO}
          className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          使用 we29.cn 账号登录
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-card text-muted">安全统一认证</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted leading-relaxed">
          点击上方按钮将跳转至 we29.cn 完成登录<br />
          支持账号密码、邮箱验证码、GitHub、QQ、抖音
        </p>

        <div className="pt-6 text-center">
          <a
            href="https://we29.cn"
            target="_blank"
            rel="noopener"
            className="text-xs text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            返回 we29.cn
          </a>
        </div>
      </div>
    </div>
  )
}

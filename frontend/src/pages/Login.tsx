import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, InputGroup, TextField } from '@heroui/react'
import { Lock, User, Zap } from 'lucide-react'
import { api } from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      localStorage.setItem('token', (res as any).token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex items-center justify-center px-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm card p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
              <Zap className="w-6 h-6 fill-current" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
          <p className="text-muted text-xs mt-1">WeiPay Sandbox Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <TextField isRequired aria-label="Username" fullWidth>
            <InputGroup className="w-full rounded-xl border border-border focus-within:border-emerald-500 transition-colors">
              <InputGroup.Prefix>
                <User className="w-4 h-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="py-3 text-sm text-foreground bg-transparent w-full focus:outline-none"
              />
            </InputGroup>
          </TextField>

          <TextField isRequired aria-label="Password" fullWidth>
            <InputGroup className="w-full rounded-xl border border-border focus-within:border-emerald-500 transition-colors">
              <InputGroup.Prefix>
                <Lock className="w-4 h-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="py-3 text-sm text-foreground bg-transparent w-full focus:outline-none"
              />
            </InputGroup>
          </TextField>

          {error && (
            <p className="text-rose-500 text-xs text-center font-medium bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            isPending={loading}
            variant="primary"
            className="w-full py-3.5 font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm transition-colors shadow-sm active:scale-[0.99]"
          >
            登录沙箱后台
          </Button>

          <div className="pt-4 text-center">
            <Link to="/" className="text-xs text-muted hover:text-emerald-500 transition-colors">
              &larr; 返回网关首页
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

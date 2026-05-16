import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@heroui/styles'
import { Zap, Code, ShieldCheck, ArrowRight, LayoutDashboard, Terminal, HandCoins, Loader2 } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useToast } from '../context/ToastContext'

export default function Home() {
  const toast = useToast()
  const [amount, setAmount] = useState('88.88')
  const [productName, setProductName] = useState('自有兜底收款体验单')
  const [loadingDemo, setLoadingDemo] = useState(false)

  const handleDemoPay = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('请输入有效的测试金额')
      return
    }
    if (!productName.trim()) {
      toast.error('请输入商品名称')
      return
    }

    setLoadingDemo(true)
    try {
      const res = await fetch('/api/native-pay/test-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, productName }),
      })
      const json = await res.json()
      if (json.code === 200 && json.data?.data) {
        toast.success('测试下单成功，正在跳转收银台...')
        window.location.href = json.data.data
      } else {
        toast.error(json.msg || '体验发起失败')
      }
    } catch {
      toast.error('网络请求异常，请检查网关状态')
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans pb-16">
      {/* Header - 极致干净极简 */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3 font-semibold text-lg tracking-tight">
            <div className="p-2 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span>WeiPay Gateway</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/dashboard"
              className={buttonVariants({ variant: 'secondary', className: 'text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 bg-surface hover:bg-surface-secondary text-foreground transition-colors' })}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              管理后台
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-12 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
          全能聚合的 <span className="text-emerald-500">沙箱支付中转网关</span>
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          专为开发联调与测试沙箱环境设计的支付路由网关。极简接入一次，智能路由到支付宝、PayPal、自有收款等多种渠道，内置兜底支付通道，确保第三方挂了你的业务照跑不误。
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href="#demo"
            className={buttonVariants({ variant: 'primary', className: 'px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors' })}
          >
            <HandCoins className="w-4 h-4" />
            在线体验兜底收款
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#api"
            className={buttonVariants({ variant: 'secondary', className: 'px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-surface hover:bg-surface-secondary text-foreground transition-colors' })}
          >
            <Terminal className="w-4 h-4" />
            查看 API 规范
          </a>
        </div>
      </section>

      {/* 实时互动演示：兜底支付在线体验模块 */}
      <section id="demo" className="py-12 max-w-2xl mx-auto px-6">
        <div className="card p-8 bg-gradient-to-b from-surface/40 to-surface/10 border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                在线测试：发起自有兜底收款
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono font-semibold uppercase">Live Demo</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">免 API 签名，直接生成一笔测试订单，跳转收银台体验付款与确认流程</p>
            </div>
          </div>

          <form onSubmit={handleDemoPay} className="space-y-4 font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-muted tracking-wide block">测试商品名称</label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="例如：高级会员季卡"
                  disabled={loadingDemo}
                  className="w-full px-4 py-2.5 rounded-xl bg-input-bg border border-border focus:border-emerald-500 focus:outline-none text-sm text-foreground transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted tracking-wide block">支付金额 (元)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium font-mono">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="88.88"
                    disabled={loadingDemo}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-input-bg border border-border focus:border-emerald-500 focus:outline-none text-sm font-mono font-semibold text-foreground transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingDemo}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loadingDemo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在为您创建收银台会话...
                </>
              ) : (
                <>
                  <HandCoins className="w-4 h-4" />
                  免签一键发起测试付款
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Features - 极致清透的高定翡翠绿图标 */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Code, title: '极简统一 API', desc: '一套标准化 JSON 接口秒接所有主流支付渠道，完全告别各平台繁杂的 SDK 与兼容性痛点。' },
            { icon: ShieldCheck, title: '金融级安全鉴权', desc: '采用严格的 HMAC-SHA256 请求签名机制，防篡改、防重放攻击，保障每一笔流水安全可靠。' },
            { icon: Zap, title: '智能高可用回调', desc: '支付成功后毫秒级异步触发 Webhook 通知，内置指数退避重试队列，确保商户端 100% 送达。' },
          ].map(f => (
            <div key={f.title} className="card p-8 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Reference */}
      <section id="api" className="py-16 max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">简洁优雅的 API 接口</h2>
          <p className="text-muted text-sm">开箱即用，支持多语言快速接入</p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {[
            { method: 'POST', path: '/api/gateway/pay', desc: '发起统一下单请求，返回收银台 URL 或付款码' },
            { method: 'GET', path: '/api/gateway/query?orderNo=xxx', desc: '主动轮询查询中转网关及上游订单支付状态' },
          ].map(api => (
            <div key={api.path} className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3 font-mono">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${api.method === 'POST' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {api.method}
                </span>
                <span className="font-medium text-foreground">{api.path}</span>
              </div>
              <p className="text-muted text-xs">{api.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-3xl mx-auto card p-6 bg-surface font-mono text-xs text-muted overflow-x-auto space-y-2.5 border-border">
          <p className="text-muted/60">// HTTP Header 鉴权规范演示</p>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span>X-WeiPay-AppKey:</span>
            <span className="text-foreground font-semibold">your_assigned_app_key</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span>X-WeiPay-Timestamp:</span>
            <span className="text-foreground font-semibold">1716000000000</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span>X-WeiPay-Nonce:</span>
            <span className="text-foreground font-semibold">random_uuid_string</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>X-WeiPay-Signature:</span>
            <span className="text-foreground font-semibold">HMAC-SHA256(body + timestamp + nonce, appSecret)</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-6 text-center text-xs text-muted">
        WeiPay Sandbox Gateway &copy; {new Date().getFullYear()} — Crafted with premium minimalism.
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '@heroui/react'
import { Zap, Code, ShieldCheck, ArrowRight, LayoutDashboard, Terminal, Loader2, Play } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { api } from '../utils/api'

export default function Home() {
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')

  const handlePublicTest = async () => {
    setTesting(true)
    setTestError('')
    try {
      const res = await api.post<{ type: string; data: string }>('/native-pay/public-test-pay')
      if (res?.data) {
        window.location.href = res.data
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '沙箱未开启或服务不可达'
      setTestError(msg)
    } finally {
      setTesting(false)
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
            <Button
              render={(props) => <Link to="/login" {...(props as any)} />}
              variant="secondary"
              className="text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 bg-surface hover:bg-surface-secondary text-foreground transition-colors h-auto min-h-0 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              管理后台
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-12 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
          全能聚合的 <span className="text-emerald-500">沙箱支付中转网关</span>
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          专为开发联调与测试沙箱环境设计的支付路由网关。极简接入一次，智能路由到支付宝、PayPal 及 WeiPay 官方存管等多种渠道，确保全链路沙盘闭环体验。
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            onPress={handlePublicTest}
            isDisabled={testing}
            className="px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors h-auto cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {testing ? '正在创建测试订单...' : '一键体验支付流程'}
            {!testing && <ArrowRight className="w-4 h-4" />}
          </Button>
          <Button
            render={(props) => <Link to="/login" {...(props as any)} />}
            variant="secondary"
            className="px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-surface hover:bg-surface-secondary text-foreground transition-colors h-auto cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            登录控制台
          </Button>
          <Button
            render={(props) => <a href="#api" {...(props as any)} />}
            variant="secondary"
            className="px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-surface hover:bg-surface-secondary text-foreground transition-colors h-auto cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            API 规范
          </Button>
        </div>

        {testError && (
          <p className="mt-4 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-4 inline-block">
            {testError}
          </p>
        )}

        <p className="mt-6 text-xs text-muted">
          点击「一键体验」将自动创建 0.01 元测试订单并跳转收银台（需沙箱模式开启）
        </p>
      </section>

      {/* Features - 极致清透的高定翡翠绿图标 */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Code, title: '极简统一 API', desc: '一套标准化 JSON 接口秒接所有主流支付渠道，完全告别各平台繁杂的 SDK 与兼容性痛点。' },
            { icon: ShieldCheck, title: '金融级安全鉴权', desc: '采用严格的 HMAC-SHA256 请求签名机制，防篡改、防重放攻击，保障每一笔流水安全可靠。' },
            { icon: Zap, title: '智能高可用回调', desc: '支付成功后毫秒级异步触发 Webhook 通知，内置指数退避重试队列，确保商户端 100% 送达。' },
          ].map(f => (
            <Card key={f.title} className="p-8 group">
              <Card.Content className="p-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </Card.Content>
            </Card>
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
            { method: 'POST', path: '/v1/api/gateway/pay', desc: '发起统一下单请求，根据 payMethod 路由到对应支付渠道' },
            { method: 'GET', path: '/v1/api/gateway/query?orderNo=xxx', desc: '查询订单状态（基于本地数据库记录）' },
          ].map(api => (
            <Card key={api.path} className="p-5">
              <Card.Content className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${api.method === 'POST' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {api.method}
                  </span>
                  <span className="font-medium text-foreground">{api.path}</span>
                </div>
                <p className="text-muted text-xs">{api.desc}</p>
              </Card.Content>
            </Card>
          ))}
        </div>

        <Card className="mt-8 max-w-3xl mx-auto p-6 bg-surface border-border">
          <Card.Content className="p-0 font-mono text-xs text-muted overflow-x-auto space-y-2.5">
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
          </Card.Content>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-6 text-center text-xs text-muted">
        WeiPay Sandbox Gateway &copy; {new Date().getFullYear()} — Crafted with premium minimalism.
      </footer>
    </div>
  )
}


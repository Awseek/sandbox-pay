import { Link } from 'react-router-dom'
import { Button, Card } from '@heroui/react'
import { Zap, Code, ShieldCheck, LayoutDashboard, Terminal } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3 font-semibold text-lg tracking-tight">
            <div className="p-2 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span>Sandbox Pay Gateway</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              render={(props) => <Link to="/admin" {...(props as any)} />}
              variant="secondary"
              className="text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 bg-surface hover:bg-surface-secondary text-foreground h-auto min-h-0 cursor-pointer"
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
          专为开发联调与测试设计的支付接入沙箱网关。一次接入，即可将下单请求路由到支付宝、PayPal 及内置兜底通道的沙箱环境，用于打通和验证完整支付流程。
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            render={(props) => <Link to="/admin" {...(props as any)} />}
            className="px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm h-auto cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            登录控制台
          </Button>
          <Button
            render={(props) => <a href="#api" {...(props as any)} />}
            variant="secondary"
            className="px-7 py-3.5 text-sm font-medium rounded-xl flex items-center gap-2 bg-surface hover:bg-surface-secondary text-foreground h-auto cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            API 规范
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Code, title: '极简统一 API', desc: '一套标准化 JSON 接口秒接所有主流支付渠道，完全告别各平台繁杂的 SDK 与兼容性痛点。' },
            { icon: ShieldCheck, title: '金融级安全鉴权', desc: '采用严格的 HMAC-SHA256 请求签名机制，防篡改、防重放攻击，保障每一笔流水安全可靠。' },
            { icon: Zap, title: '异步回调通知', desc: '支付状态变更后异步触发 Webhook 通知，内置指数退避重试队列，提升回调送达率。' },
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
            { method: 'POST', path: '/v1/api/gateway/pay', desc: '统一下单（需传 payMethod: alipay / paypal / native）' },
            { method: 'POST', path: '/v1/api/gateway/alipay/pay', desc: '直接调用支付宝下单（无需传 payMethod）' },
            { method: 'POST', path: '/v1/api/gateway/paypal/pay', desc: '直接调用 PayPal 下单（无需传 payMethod）' },
            { method: 'POST', path: '/v1/api/gateway/native/pay', desc: '直接调用官方存管下单（无需传 payMethod）' },
            { method: 'GET', path: '/v1/api/gateway/query?orderNo=xxx', desc: '查询订单状态' },
            { method: 'POST', path: '/v1/api/gateway/refund', desc: '发起全额或部分退款（需订单已支付）' },
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
              <span>X-Sandbox-Pay-AppKey:</span>
              <span className="text-foreground font-semibold">your_assigned_app_key</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span>X-Sandbox-Pay-Timestamp:</span>
              <span className="text-foreground font-semibold">1716000000000</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span>X-Sandbox-Pay-Nonce:</span>
              <span className="text-foreground font-semibold">random_uuid_string</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>X-Sandbox-Pay-Signature:</span>
              <span className="text-foreground font-semibold">HMAC-SHA256(body + timestamp + nonce, appSecret)</span>
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-6 text-center text-xs text-muted">
        Sandbox Pay Gateway &copy; {new Date().getFullYear()} — Crafted with premium minimalism.
      </footer>
    </div>
  )
}

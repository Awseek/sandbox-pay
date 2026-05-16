import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Zap, Clock, CheckCircle2, XCircle, Copy, Check,
  QrCode, Building2, ArrowRight, RefreshCw, AlertTriangle
} from 'lucide-react'

interface CashierInfo {
  orderNo: string
  amount: number
  productName: string
  status: 'pending' | 'paid' | 'expired' | 'failed'
  expireAt?: string
  payAt?: string
  paymentInfo?: {
    qrCodeUrl: string
    accountName: string
    accountNo: string
    bankName: string
    remark: string
  }
}

export default function Cashier() {
  const [searchParams] = useSearchParams()
  const orderNo = searchParams.get('orderNo') || ''
  const [info, setInfo] = useState<CashierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchInfo = async () => {
    try {
      const res = await fetch(`/api/native-pay/cashier?orderNo=${orderNo}`)
      const json = await res.json()
      if (json.code === 200) {
        setInfo(json.data)
        if (json.data.status === 'paid' || json.data.status === 'expired' || json.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } else {
        setError(json.msg || '订单查询失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orderNo) {
      setError('缺少订单号')
      setLoading(false)
      return
    }
    fetchInfo()
    // 每 5 秒轮询一次状态
    pollRef.current = setInterval(fetchInfo, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [orderNo])

  // 倒计时
  useEffect(() => {
    if (!info?.expireAt || info.status !== 'pending') return
    const timer = setInterval(() => {
      const now = Date.now()
      const expire = new Date(info.expireAt!).getTime()
      const diff = expire - now
      if (diff <= 0) {
        setCountdown('已过期')
        clearInterval(timer)
        fetchInfo()
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [info?.expireAt, info?.status])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-muted text-sm">正在加载订单信息...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">订单异常</h2>
          <p className="text-muted text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!info) return null

  // 已支付状态
  if (info.status === 'paid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 animate-bounce-once">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">支付成功</h2>
          <p className="text-muted text-sm mb-6">订单已确认收款</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2.5 border-b border-border/60">
              <span className="text-muted">订单号</span>
              <span className="font-mono font-medium text-foreground">{info.orderNo}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-border/60">
              <span className="text-muted">商品</span>
              <span className="font-medium text-foreground">{info.productName}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted">支付金额</span>
              <span className="text-xl font-bold text-emerald-500">¥{info.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 过期 / 失败状态
  if (info.status === 'expired' || info.status === 'failed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {info.status === 'expired' ? '订单已过期' : '支付失败'}
          </h2>
          <p className="text-muted text-sm mb-4">
            {info.status === 'expired' ? '请重新下单' : '请联系客服处理'}
          </p>
          <div className="text-xs font-mono text-muted">单号: {info.orderNo}</div>
        </div>
      </div>
    )
  }

  // Pending - 收银台主界面
  const paymentInfo = info.paymentInfo
  const hasQrCode = paymentInfo?.qrCodeUrl && paymentInfo.qrCodeUrl.trim() !== ''
  const hasBankInfo = paymentInfo?.accountNo && paymentInfo.accountNo.trim() !== ''

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-2.5 font-semibold text-base tracking-tight">
            <div className="p-1.5 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            WeiPay 收银台
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            沙盒模式
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* 订单信息卡片 */}
        <div className="card p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-xs text-muted mb-1">应付金额</p>
            <p className="text-4xl font-bold tracking-tight text-foreground">
              <span className="text-xl font-medium text-muted mr-0.5">¥</span>
              {info.amount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted">商品名称</span>
              <span className="font-medium text-foreground">{info.productName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted">订单号</span>
              <button
                onClick={() => handleCopy(info.orderNo, 'orderNo')}
                className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-emerald-500 transition-colors"
              >
                {info.orderNo}
                {copied === 'orderNo' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted" />}
              </button>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">剩余支付时间</span>
              <span className={`font-mono font-semibold ${countdown === '已过期' ? 'text-rose-500' : 'text-amber-500'}`}>
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {countdown || '计算中...'}
              </span>
            </div>
          </div>
        </div>

        {/* 付款方式区域 */}
        <div className="space-y-5">
          {/* 扫码支付 */}
          {hasQrCode && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">扫码支付</h3>
                  <p className="text-xs text-muted">使用支付 App 扫描二维码</p>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-border">
                  <img
                    src={paymentInfo!.qrCodeUrl}
                    alt="Payment QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>
              <p className="text-center text-xs text-muted">
                扫码后请在支付备注中填写：<br/>
                <button
                  onClick={() => handleCopy(paymentInfo!.remark, 'remark')}
                  className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 rounded-lg bg-surface font-mono font-semibold text-foreground hover:text-emerald-500 transition-colors"
                >
                  {paymentInfo!.remark}
                  {copied === 'remark' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </p>
            </div>
          )}

          {/* 银行转账 */}
          {hasBankInfo && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">银行转账</h3>
                  <p className="text-xs text-muted">手动转账至以下账户</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentInfo!.bankName && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/80 text-sm">
                    <span className="text-muted text-xs">开户银行</span>
                    <span className="font-medium text-foreground">{paymentInfo!.bankName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/80 text-sm">
                  <span className="text-muted text-xs">收款户名</span>
                  <span className="font-medium text-foreground">{paymentInfo!.accountName}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/80 text-sm">
                  <span className="text-muted text-xs">收款账号</span>
                  <button
                    onClick={() => handleCopy(paymentInfo!.accountNo, 'accountNo')}
                    className="flex items-center gap-1.5 font-mono font-medium text-foreground hover:text-emerald-500 transition-colors"
                  >
                    {paymentInfo!.accountNo}
                    {copied === 'accountNo' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm">
                  <span className="text-muted text-xs">转账备注</span>
                  <button
                    onClick={() => handleCopy(paymentInfo!.remark, 'remarkBank')}
                    className="flex items-center gap-1.5 font-mono font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    {paymentInfo!.remark}
                    {copied === 'remarkBank' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/80 text-sm">
                  <span className="text-muted text-xs">转账金额</span>
                  <span className="font-bold text-lg text-foreground">¥{info.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 沙盒模式 - 无真实支付方式 */}
          {!hasQrCode && !hasBankInfo && (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">沙盒模式</h3>
              <p className="text-sm text-muted mb-4">
                当前为测试环境，支付功能仅供演示。
              </p>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-500 mb-4">
                此订单不会产生真实扣款
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/native-pay/sandbox-confirm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderNo: info.orderNo }),
                    });
                    const json = await res.json();
                    if (json.code === 200) {
                      fetchInfo(); // 刷新状态
                    }
                  } catch (err) {
                    console.error('Sandbox confirm error:', err);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
              >
                模拟支付完成
              </button>
              <div className="mt-4 p-3 rounded-xl bg-surface text-xs font-mono text-muted">
                订单号: {info.orderNo}
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-muted flex items-center justify-center gap-1.5">
            <ArrowRight className="w-3 h-3" />
            转账完成后请耐心等待，管理员确认后将自动通知
          </p>
          <p className="text-[10px] text-muted/60 font-mono">
            WeiPay Secure Payment · Powered by WeiPay Gateway
          </p>
        </div>
      </main>
    </div>
  )
}

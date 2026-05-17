import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, Check, Smartphone, Zap, Lock, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react'
import { api, ApiError } from '../utils/api'
import { Button, Card } from '@heroui/react'

interface CashierInfo {
  orderNo: string
  amount: number
  productName: string
  status: string
  expireAt: string
}

export default function MobilePay() {
  const [searchParams] = useSearchParams()
  const orderNo = searchParams.get('orderNo')

  const [info, setInfo] = useState<CashierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [paidSuccess, setPaidSuccess] = useState(false)

  const fetchInfo = async () => {
    if (!orderNo) {
      setError('缺少付款单号')
      setLoading(false)
      return
    }

    try {
      const data = await api.get<CashierInfo>(`/native-pay/cashier?orderNo=${orderNo}`)
      setInfo(data)
      if (data.status === 'paid' || data.status === 'success') {
        setPaidSuccess(true)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || '获取单据失败')
      } else {
        const message = err instanceof Error ? err.message : String(err)
        setError('网络连接超时: ' + message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInfo()
  }, [orderNo])

  const handleConfirmPay = async () => {
    if (!info) return
    setPaying(true)
    try {
      await api.post('/native-pay/sandbox-confirm', {
        orderNo: info.orderNo,
        walletUser: 'mobile_scan@weipay.cn',
        walletPass: '123456',
      })
      setPaidSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '无法通过存管网关核对'
      alert('支付鉴权驳回: ' + message)
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">WeiPay H5 Checkout Initializing...</p>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col items-center justify-center text-center font-sans">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-neutral-200 mb-2">订单状态解析异常</h2>
        <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-6">{error || '未能找到对应的待支付账单，请返回电脑端重新生成扫码'}</p>
        <Button
          onPress={() => window.close()}
          className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-2xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>关闭本页</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
      {/* 顶部安全标识条 */}
      <header className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">WeiPay Mobile Escrow</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>存管直连</span>
        </div>
      </header>

      {/* 主界面内容 */}
      <main className="flex-1 px-5 py-8 max-w-md mx-auto w-full flex flex-col justify-center space-y-6">
        {paidSuccess ? (
          <Card className="bg-neutral-900/80 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/10 animate-scale-up">
            <Card.Content className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_#34d399] animate-bounce">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">资金清算已核对成功</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  电脑端 PC 收银台正在自动抓取状态通知...<br />
                  <span className="text-emerald-400 font-bold mt-1 inline-block">您现在可以查看电脑屏幕的实时跳转！</span>
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-800/80 font-mono text-neutral-500 text-[10px] flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>AES-256 存管级加密通道 · 零资金风险</span>
              </div>
            </Card.Content>
          </Card>
        ) : (
          <Card className="bg-neutral-900/80 border border-neutral-800 rounded-3xl shadow-xl relative overflow-hidden">
            <Card.Content className="p-6 space-y-6">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* 收款方抬头 */}
              <div className="text-center space-y-2 pb-6 border-b border-neutral-800 relative z-10">
                <div className="text-xs text-neutral-400 font-medium">向商户存管专户支付</div>
                <div className="text-3xl font-black text-white font-mono tracking-tight text-emerald-400">
                  ¥ {info.amount.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-300 font-medium truncate px-4">{info.productName}</div>
              </div>

              {/* 交易详情项 */}
              <div className="space-y-3.5 text-xs text-neutral-300 font-mono relative z-10">
                <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500 font-sans font-medium">收款机构</span>
                  <span className="text-white font-bold">WeiPay 官方存管清算中心</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500 font-sans font-medium">清算单号</span>
                  <span className="text-neutral-300 truncate max-w-[180px]">{info.orderNo}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500 font-sans font-medium">模拟账户</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>钱包沙盒测试专户</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-neutral-800/60">
                  <span className="text-neutral-500 font-sans font-medium">账户余额</span>
                  <span className="text-neutral-200">¥ 88,888.00 (无风险额度)</span>
                </div>
              </div>

              {/* 支付按钮 */}
              <div className="pt-4 relative z-10 space-y-3">
                <Button
                  isDisabled={paying}
                  onPress={handleConfirmPay}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white font-bold rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wider font-sans uppercase"
                >
                  {paying ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>确认验证并付款 ¥ {info.amount.toFixed(2)}</span>
                    </>
                  )}
                </Button>
                <div className="text-[10px] text-center text-neutral-500 flex items-center justify-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>中国人民银行资金安全护航 · 即时结算</span>
                </div>
              </div>
            </Card.Content>
          </Card>
        )}
      </main>

      {/* 底部 */}
      <footer className="py-6 text-center text-[10px] text-neutral-600 font-mono border-t border-neutral-900 bg-neutral-950">
        WeiPay Mobile H5 Checkout &copy; {new Date().getFullYear()}<br />Financial Grade Clearness
      </footer>
    </div>
  )
}


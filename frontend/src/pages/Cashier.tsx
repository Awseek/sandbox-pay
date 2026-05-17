import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Zap, Clock, CheckCircle2, XCircle, Copy, Check,
  QrCode, Building2, ArrowRight, RefreshCw, AlertCircle,
  ShieldCheck, Lock, Smartphone, CreditCard, Globe, ExternalLink
} from 'lucide-react'
import { FaAlipay, FaPaypal } from 'react-icons/fa6'
import { api, ApiError } from '../utils/api'
import { Button, TextField, InputGroup, Card, Modal } from '@heroui/react'

interface CashierInfo {
  orderNo: string
  amount: number
  productName: string
  status: 'pending' | 'paid' | 'expired' | 'failed'
  payMethod?: string
  thirdPartyTradeNo?: string
  expireAt?: string
  payAt?: string
  paymentInfo?: {
    qrCodeUrl: string
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
  const [activeTab, setActiveTab] = useState<'alipay' | 'paypal' | 'bank'>('alipay')
  const [nativeMode, setNativeMode] = useState<'qrcode' | 'login'>('qrcode')
  const [walletUser, setWalletUser] = useState('demo_buyer@weipay.cn')
  const [walletPass, setWalletPass] = useState('123456')
  const [payingNative, setPayingNative] = useState(false)
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [scannerStep, setScannerStep] = useState<'scanning' | 'confirm' | 'success'>('scanning')
  const [switching, setSwitching] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchInfo = async () => {
    try {
      const data = await api.get<CashierInfo>(`/native-pay/cashier?orderNo=${orderNo}`)
      setInfo(data)
      if (data.status === 'paid' || data.status === 'expired' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || '订单查询失败')
      } else {
        setError('网络异常，请稍后重试')
      }
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

  const handleInvokeRealGateway = async (channel: 'alipay' | 'paypal') => {
    if (!info || switching) return
    setSwitching(true)
    try {
      // Controller wraps its result in `{ code, data: { type, data } }`; the global
      // TransformInterceptor adds another wrapper which `api.post` strips, leaving
      // us with the inner `{ code, data: { type, data } }`.
      const payload = await api.post<{ code: number; data: { type: string; data: string } }>(
        '/native-pay/switch-channel',
        { orderNo: info.orderNo, channel },
      )
      const formContent = payload?.data?.data
      if (!formContent) {
        alert('网关调用异常：返回负载为空')
        return
      }
      if (channel === 'paypal') {
        window.location.href = formContent
      } else if (channel === 'alipay') {
        if (formContent.startsWith('http')) {
          window.location.href = formContent
        } else {
          const div = document.createElement('div')
          div.innerHTML = formContent
          document.body.appendChild(div)
          const form = div.querySelector('form')
          if (form) form.submit()
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '沙盒凭证过期或连接受阻'
      alert('网关调用异常: ' + message)
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-muted text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          <span>正在加载收银台数据...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold mb-2">收银台加载失败</h2>
          <p className="text-muted text-sm mb-6">{error}</p>
        </div>
      </div>
    )
  }

  if (!info) return null

  // 已支付状态
  if (info.status === 'paid') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12 font-sans selection:bg-emerald-500 selection:text-white">
        <Card className="max-w-md w-full rounded-3xl shadow-xl relative overflow-hidden">
          <Card.Content className="p-8">
            {/* 背景光晕 */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center pb-6 border-b border-border/80">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">支付成功</h2>
              <p className="text-muted text-xs mt-1">收款存管方：WeiPay 官方清算中心</p>
            </div>

            <div className="py-6 space-y-4 text-sm font-medium">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">商户单号</span>
                <span className="font-mono text-foreground font-semibold">{info.orderNo}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">交易商品</span>
                <span className="text-foreground font-semibold">{info.productName}</span>
              </div>

              {/* 支付方式 */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">结算渠道</span>
                <span className="flex items-center gap-1.5 font-semibold font-mono">
                  {info.payMethod === 'alipay' ? (
                    <span className="inline-flex items-center gap-1 text-[#1677ff] bg-[#1677ff]/10 border border-[#1677ff]/20 px-2.5 py-0.5 rounded-full text-[11px]">
                      <Smartphone className="w-3 h-3" />
                      支付宝直连
                    </span>
                  ) : info.payMethod === 'paypal' ? (
                    <span className="inline-flex items-center gap-1 text-[#0079C1] bg-[#0079C1]/10 border border-[#0079C1]/20 px-2.5 py-0.5 rounded-full text-[11px]">
                      <Globe className="w-3 h-3" />
                      PayPal 国际
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
                      <Building2 className="w-3 h-3" />
                      网关快捷结算
                    </span>
                  )}
                </span>
              </div>

              {/* 流水号 */}
              {info.thirdPartyTradeNo && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">网关核销凭据</span>
                  <span className="font-mono text-foreground text-[11px] truncate max-w-[200px]" title={info.thirdPartyTradeNo}>
                    {info.thirdPartyTradeNo}
                  </span>
                </div>
              )}

              {/* 支付时间 */}
              {info.payAt && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">核销清算时间</span>
                  <span className="font-mono text-foreground text-[11px]">
                    {new Date(info.payAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-border/80">
                <span className="text-muted text-xs font-semibold">实付总额</span>
                <span className="text-3xl font-bold text-emerald-500 font-mono tracking-tight">
                  <span className="text-lg font-normal mr-1">¥</span>
                  {info.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Button
                onPress={() => { window.location.href = '/dashboard' }}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>返回商户控制台查看凭证</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    )
  }

  // 过期 / 失败状态
  if (info.status === 'expired' || info.status === 'failed') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12 font-sans">
        <Card className="max-w-md w-full rounded-2xl shadow-sm">
          <Card.Content className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-2">
              {info.status === 'expired' ? '订单已超时关闭' : '交易异常'}
            </h2>
            <p className="text-muted text-xs mb-6">
              {info.status === 'expired' ? '当前单据已超过有效支付时间，请返回重新下单。' : '系统核销未能成功，请联系商户。'}
            </p>
            <div className="text-xs font-mono text-muted">流水号: {info.orderNo}</div>
          </Card.Content>
        </Card>
      </div>
    )
  }

  const paymentInfo = info.paymentInfo
  const qrUrl = paymentInfo?.qrCodeUrl && paymentInfo.qrCodeUrl.trim() !== ''
    ? paymentInfo.qrCodeUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=WEIPAY_SANDBOX_ORDER_${info.orderNo}`
  const remark = paymentInfo?.remark || `WP${info.orderNo}`

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      {/* 极简顶栏 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between py-3 px-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span>WeiPay 收银台</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>沙盒测试模式</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* 订单单据卡片 */}
        <Card className="mb-6 shadow-sm">
          <Card.Content className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
              <div>
                <div className="text-xs text-muted mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>收款方：WeiPay 官方结算收单直联</span>
                </div>
                <h1 className="text-base font-bold text-foreground mt-0.5">{info.productName}</h1>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-muted block mb-0.5">应收总额</span>
                <span className="text-3xl sm:text-4xl font-bold font-mono text-emerald-500">
                  <span className="text-xl font-normal mr-1">¥</span>
                  {info.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono text-muted">
                <span>单号: {info.orderNo}</span>
                <Button
                  isIconOnly
                  variant="ghost"
                  onPress={() => handleCopy(info.orderNo, 'orderNo')}
                  aria-label="复制单号"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1 h-auto min-h-0 min-w-0 p-0 bg-transparent cursor-pointer"
                >
                  {copied === 'orderNo' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-mono font-medium bg-amber-500/10 px-2.5 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5" />
                <span>剩余 {countdown || '--:--'}</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* 支付方式导航栏 */}
        <div className="flex items-center gap-2 mb-6 bg-surface p-1 rounded-xl border border-border">
          <Button
            variant="ghost"
            onPress={() => setActiveTab('alipay')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer h-auto ${
              activeTab === 'alipay' ? 'bg-card text-foreground shadow-sm font-semibold scale-102' : 'text-muted hover:text-foreground'
            }`}
          >
            <FaAlipay className="w-4 h-4 text-[#1677ff] shrink-0" />
            <span className="tracking-wide font-sans">支付宝</span>
          </Button>
          <Button
            variant="ghost"
            onPress={() => setActiveTab('paypal')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer h-auto ${
              activeTab === 'paypal' ? 'bg-card text-foreground shadow-sm font-semibold scale-102' : 'text-muted hover:text-foreground'
            }`}
          >
            <FaPaypal className="w-4 h-4 text-[#0079C1] shrink-0" />
            <span className="tracking-wide font-sans">PayPal 国际</span>
          </Button>
          <Button
            variant="ghost"
            onPress={() => setActiveTab('bank')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer h-auto ${
              activeTab === 'bank' ? 'bg-card text-foreground shadow-sm font-semibold scale-102' : 'text-muted hover:text-foreground'
            }`}
          >
            <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-2.5 h-2.5 fill-current" />
            </div>
            <span className="tracking-wide font-bold font-sans">WeiPay 官方存管</span>
          </Button>
        </div>

        {/* 支付面板区 */}
        <Card className="mb-6 shadow-sm">
          <Card.Content className="p-8">
            {activeTab === 'alipay' && (
              <div className="flex flex-col items-center text-center py-2 space-y-6">
                <Button
                  isDisabled={switching}
                  onPress={() => handleInvokeRealGateway('alipay')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#1677ff] hover:bg-[#0e5ec8] text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{switching ? '正在接通官方网关...' : '直接前往支付宝官方收银台付款'}</span>
                </Button>

                <div className="flex items-center gap-4 w-full my-2">
                  <div className="h-[1px] bg-border flex-1" />
                  <span className="text-xs text-muted">或使用支付宝（沙箱版）App 直接扫码完成付款</span>
                  <div className="h-[1px] bg-border flex-1" />
                </div>

                <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                  <img
                    src={qrUrl}
                    alt="Alipay QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <div className="inline-flex items-center gap-2 bg-surface px-4 py-2 rounded-xl text-xs font-mono border border-border">
                  <span className="text-muted">支付附言识别码:</span>
                  <span className="font-bold text-foreground">{remark}</span>
                  <Button
                    isIconOnly
                    variant="ghost"
                    onPress={() => handleCopy(remark, 'remark')}
                    aria-label="复制附言"
                    className="hover:text-emerald-500 transition-colors ml-1 h-auto min-h-0 min-w-0 p-0 bg-transparent cursor-pointer"
                  >
                    {copied === 'remark' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'paypal' && (
              <div className="py-6 text-center max-w-sm mx-auto space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-[#0079C1] flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-1">通过 PayPal 极速结账</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    支持关联您的国际借记卡、信用卡及境外账户，系统将自动进行货币汇兑与鉴权。
                  </p>
                </div>
                <Button
                  isDisabled={switching}
                  onPress={() => handleInvokeRealGateway('paypal')}
                  className="w-full py-3.5 px-6 bg-[#0079C1] hover:bg-[#005e96] text-white font-medium text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{switching ? '正在接通 PayPal 结账通道...' : '前往 PayPal 安全结账'}</span>
                </Button>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="py-2 font-sans animate-fade-in">
                {/* 高级分段式切换滑块 */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl border border-border shadow-inner">
                    <Button
                      variant="ghost"
                      onPress={() => setNativeMode('qrcode')}
                      className={`py-2 px-6 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer h-auto ${
                        nativeMode === 'qrcode'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-102 font-bold'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>扫码极速结算</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onPress={() => setNativeMode('login')}
                      className={`py-2 px-6 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer h-auto ${
                        nativeMode === 'login'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-102 font-bold'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>钱包登录扣款</span>
                    </Button>
                  </div>
                </div>

                {nativeMode === 'qrcode' ? (
                  <div className="flex flex-col items-center text-center py-4 space-y-6 max-w-sm mx-auto">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span>WeiPay 沙盒客户端扫码直通</span>
                      </h3>
                      <p className="text-xs text-muted leading-relaxed">
                        请使用 WeiPay 沙盒钱包 App 或微信扫一扫，体验秒级自愈与资金鉴权核验。
                      </p>
                    </div>

                    {/* 精装二维码画框 */}
                    <div className="relative p-6 bg-white rounded-3xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 flex items-center justify-center group transition-all duration-300 hover:border-emerald-500/40">
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                          window.location.origin + '/mobile-pay?orderNo=' + info.orderNo
                        )}`}
                        alt="WeiPay QR Code"
                        className="w-52 h-52 object-contain relative z-10"
                      />
                    </div>

                    <div className="w-full pt-4 space-y-3">
                      <Button
                        isDisabled={payingNative}
                        onPress={() => {
                          setShowScannerModal(true)
                          setScannerStep('scanning')
                          setTimeout(() => {
                            setScannerStep('confirm')
                          }, 1200)
                        }}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide font-sans"
                      >
                        <Smartphone className="w-4 h-4 fill-current" />
                        <span>模拟手机钱包 App 扫一扫</span>
                      </Button>
                      <div className="text-[11px] text-muted flex items-center justify-center gap-1 font-mono">
                        <span>安全附言识别码：</span>
                        <span className="font-bold text-emerald-500">{remark}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto space-y-6 bg-surface/80 backdrop-blur-md p-8 rounded-3xl border border-border/80 shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="text-center pb-4 border-b border-border/80 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-500/20">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <h3 className="font-bold text-lg text-foreground tracking-tight">存管钱包直连验证</h3>
                      <p className="text-xs text-muted mt-1">系统已加载沙盒结算体验凭据，可一键扣款</p>
                    </div>

                    <div className="space-y-4 text-left relative z-10 font-sans">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted mb-1.5 font-mono uppercase tracking-wider">
                          WeiPay 存管账号 / 邮箱
                        </label>
                        <TextField aria-label="存管账号" fullWidth>
                          <InputGroup className="w-full bg-background border border-border rounded-2xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm">
                            <InputGroup.Prefix>
                              <Smartphone className="w-4 h-4 text-muted ml-3.5" />
                            </InputGroup.Prefix>
                            <InputGroup.Input
                              type="text"
                              value={walletUser}
                              onChange={(e) => setWalletUser(e.target.value)}
                              className="w-full bg-transparent pl-2.5 pr-4 py-3.5 text-xs text-foreground focus:outline-none font-mono font-medium"
                              placeholder="请输入支付邮箱或手机号"
                            />
                          </InputGroup>
                        </TextField>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted mb-1.5 font-mono uppercase tracking-wider">
                          支付鉴权密码 (PIN)
                        </label>
                        <TextField aria-label="支付密码" fullWidth>
                          <InputGroup className="w-full bg-background border border-border rounded-2xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm">
                            <InputGroup.Prefix>
                              <Lock className="w-4 h-4 text-muted ml-3.5" />
                            </InputGroup.Prefix>
                            <InputGroup.Input
                              type="password"
                              value={walletPass}
                              onChange={(e) => setWalletPass(e.target.value)}
                              className="w-full bg-transparent pl-2.5 pr-4 py-3.5 text-xs text-foreground focus:outline-none font-mono tracking-widest"
                              placeholder="请输入6位支付密码"
                            />
                          </InputGroup>
                        </TextField>
                      </div>
                    </div>

                    <div className="pt-2 relative z-10">
                      <Button
                        isDisabled={payingNative || !walletUser || !walletPass}
                        onPress={async () => {
                          setPayingNative(true)
                          try {
                            await api.post('/native-pay/sandbox-confirm', {
                              orderNo: info.orderNo,
                              walletUser,
                              walletPass,
                            })
                            fetchInfo()
                          } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : '安全凭据校验未通过或通道受限'
                            alert('账户鉴权失败: ' + message)
                          } finally {
                            setPayingNative(false)
                          }
                        }}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider font-mono"
                      >
                        {payingNative ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-current" />
                            <span>确认验证并扣款 ¥ {info.amount.toFixed(2)}</span>
                          </>
                        )}
                      </Button>
                      <div className="text-[10px] text-center text-muted flex items-center justify-center gap-1.5 pt-3 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>国家存管清算中心 · 零风险即时直达</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* 全链路沙盒手机钱包 App 扫码模态框 (Full-loop Simulator Modal) */}
        <Modal>
          <Modal.Backdrop isOpen={showScannerModal} onOpenChange={setShowScannerModal} variant="blur">
            <Modal.Container size="xs">
              <Modal.Dialog className="bg-neutral-900 border-4 border-neutral-700 p-6 text-white shadow-2xl rounded-[40px] overflow-hidden flex flex-col items-center">
                {/* 听筒与刘海屏装饰 */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-800 rounded-b-xl flex items-center justify-center">
                  <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
                </div>

                {/* App 标题栏 */}
                <Modal.Header className="w-full flex items-center justify-between pt-4 pb-2 border-b border-neutral-800 text-xs px-0">
                  <Modal.Heading className="font-semibold tracking-wide text-neutral-300">WeiPay App - 扫一扫</Modal.Heading>
                  <Modal.CloseTrigger className="text-neutral-400 hover:text-white transition-colors text-sm font-bold p-1 cursor-pointer h-auto min-h-0 min-w-0 bg-transparent" />
                </Modal.Header>

                {/* 模态框主体内容区 */}
                <Modal.Body className="w-full py-8 flex flex-col items-center text-center min-h-[280px] justify-center space-y-4 px-0">
                  {scannerStep === 'scanning' && (
                    <div className="space-y-6 flex flex-col items-center">
                      <div className="relative w-40 h-40 border-2 border-dashed border-emerald-500 rounded-3xl flex items-center justify-center p-2 animate-pulse">
                        <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-[bounce_2s_infinite]" />
                        <QrCode className="w-20 h-20 text-emerald-500/50" />
                      </div>
                      <div className="text-xs text-neutral-400 font-mono tracking-wider animate-pulse">
                        正在对准付款码识别中...
                      </div>
                    </div>
                  )}

                  {scannerStep === 'confirm' && (
                    <div className="space-y-5 w-full px-2 animate-scale-up">
                      <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-neutral-400">支付给</div>
                        <div className="font-bold text-base tracking-tight text-white">WeiPay 官方存管清算网关</div>
                        <div className="text-2xl font-mono font-bold text-emerald-400 pt-1">
                          ¥ {info.amount.toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-neutral-800/80 rounded-2xl p-3.5 text-left text-[11px] space-y-2 border border-neutral-700/50 font-mono">
                        <div className="flex justify-between text-neutral-400 pb-1.5 border-b border-neutral-700/50">
                          <span>付款单号：</span>
                          <span className="text-neutral-200 truncate max-w-[140px]">{info.orderNo}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>扣款账户：</span>
                          <span className="text-emerald-400 font-bold">沙盒模拟钱包 (可用 ¥88,888.00)</span>
                        </div>
                      </div>

                      <Button
                        isDisabled={payingNative}
                        onPress={async () => {
                          setPayingNative(true)
                          try {
                            await api.post('/native-pay/sandbox-confirm', {
                              orderNo: info.orderNo,
                              walletUser: 'app_scan@weipay.cn',
                              walletPass: '123456',
                            })
                            setScannerStep('success')
                            setTimeout(() => {
                              setShowScannerModal(false)
                              fetchInfo()
                            }, 1200)
                          } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : '该单据不可通过存管网关核销'
                            alert('通道清算驳回: ' + message)
                          } finally {
                            setPayingNative(false)
                          }
                        }}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wider"
                      >
                        {payingNative ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                        <span>确认向商户付款</span>
                      </Button>
                    </div>
                  )}

                  {scannerStep === 'success' && (
                    <div className="space-y-4 flex flex-col items-center animate-fade-in">
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_#34d399] animate-bounce">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>
                      <div className="text-base font-bold text-white tracking-wide">支付核销成功！</div>
                      <div className="text-xs text-emerald-400 font-mono">正在同步通知收银台...</div>
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer className="flex justify-center pb-0 pt-2 px-0">
                  <div className="w-32 h-1 bg-neutral-700 rounded-full" />
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* 底部信息 */}
        <footer className="mt-12 text-center text-[11px] text-muted font-mono">
          WeiPay Secure Gateway &copy; {new Date().getFullYear()} — Financial Grade Clearness
        </footer>
      </main>
    </div>
  )
}


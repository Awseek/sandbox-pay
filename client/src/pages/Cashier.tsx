import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Zap, Copy, Check, QrCode, ShieldCheck, Lock, Smartphone,
  CreditCard, ExternalLink, RefreshCw,
} from 'lucide-react'
import { FaAlipay, FaPaypal } from 'react-icons/fa6'
import { api, ApiError } from '../utils/api'
import { useOrderStatus } from '../utils/socket'
import { showToast as toast } from '../utils/toast'
import { Button, TextField, InputGroup, Card } from '@heroui/react'
import type { CashierInfo } from '../components/dashboard/types'
import OrderInfoCard from '../components/cashier/OrderInfoCard'
import { PaidView, ExpiredFailedView, ErrorView, LoadingView } from '../components/cashier/StatusViews'
import ScannerModal from '../components/cashier/ScannerModal'

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
  const [walletUser, setWalletUser] = useState('')
  const [walletPass, setWalletPass] = useState('')
  const [payingNative, setPayingNative] = useState(false)
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [switching, setSwitching] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchInfo = useCallback(async () => {
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
  }, [orderNo])

  useEffect(() => {
    if (!orderNo) {
      setError('缺少订单号')
      setLoading(false)
      return
    }
    fetchInfo()
    pollRef.current = setInterval(fetchInfo, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [orderNo, fetchInfo])

  const handleWsStatus = useCallback((status: string) => {
    if (status === 'paid' || status === 'refunded' || status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
      fetchInfo()
    }
  }, [fetchInfo])
  useOrderStatus(orderNo, handleWsStatus)

  useEffect(() => {
    if (!info?.expireAt || info.status !== 'pending') return
    const timer = setInterval(() => {
      const diff = new Date(info.expireAt!).getTime() - Date.now()
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
  }, [info?.expireAt, info?.status, fetchInfo])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('已复制')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleInvokeRealGateway = async (channel: 'alipay' | 'paypal') => {
    if (!info || switching) return
    setSwitching(true)
    try {
      const payload = await api.post<{ type: string; data: string }>(
        '/native-pay/switch-channel',
        { orderNo: info.orderNo, channel },
      )
      const formContent = payload?.data
      if (!formContent) {
        toast.error('网关调用异常：返回负载为空')
        return
      }
      if (channel === 'paypal') {
        window.location.href = formContent
      } else if (channel === 'alipay') {
        if (formContent.startsWith('http')) {
          window.location.href = formContent
        } else {
          const parser = new DOMParser()
          const doc = parser.parseFromString(formContent, 'text/html')
          const form = doc.querySelector('form')
          if (!form) {
            toast.error('支付宝返回的表单无效')
            return
          }
          doc.querySelectorAll('script').forEach(s => s.remove())
          document.body.appendChild(form)
          form.submit()
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '沙盒凭证过期或连接受阻'
      toast.error('网关调用异常: ' + message)
    } finally {
      setSwitching(false)
    }
  }

  const handleNativePay = async () => {
    if (!info) return
    setPayingNative(true)
    try {
      await api.post('/native-pay/sandbox-confirm', {
        orderNo: info.orderNo,
        walletUser: walletUser || 'demo_buyer@weipay.cn',
        walletPass: walletPass || '123456',
      })
      toast.success('支付成功')
      fetchInfo()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '安全凭据校验未通过或通道受限'
      toast.error('账户鉴权失败: ' + message)
    } finally {
      setPayingNative(false)
    }
  }

  if (loading) return <LoadingView />
  if (error) return <ErrorView error={error} />
  if (!info) return null
  if (info.status === 'paid') return <PaidView info={info} />
  if (info.status === 'expired' || info.status === 'failed') return <ExpiredFailedView info={info} />

  const paymentInfo = info.paymentInfo
  const qrUrl = paymentInfo?.qrCodeUrl?.trim()
    ? paymentInfo.qrCodeUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=WEIPAY_SANDBOX_ORDER_${info.orderNo}`
  const remark = paymentInfo?.remark || `WP${info.orderNo}`

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span>WeiPay 收银台</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>沙盒测试模式</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧：订单信息 */}
          <div className="lg:col-span-5 space-y-6">
            <OrderInfoCard info={info} countdown={countdown} copied={copied} onCopy={handleCopy} />
            <div className="hidden lg:block bg-surface/50 border border-border/60 rounded-2xl p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">官方存管与清算</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">资金直接存管于官方账户，通过智能清算系统完成实时鉴权与核销。</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">银行级传输加密</h4>
                  <p className="text-[11px] text-muted leading-relaxed mt-1">全站 SSL/TLS 高强度传输加密，确保支付信息不被窃听。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：支付方式 */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tab 切换 */}
            <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-border">
              {[
                { key: 'alipay' as const, icon: <FaAlipay className="w-4 h-4 text-[#1677ff]" />, label: '支付宝' },
                { key: 'paypal' as const, icon: <FaPaypal className="w-4 h-4 text-[#0079C1]" />, label: 'PayPal 国际' },
                { key: 'bank' as const, icon: <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center"><Zap className="w-2.5 h-2.5 fill-current" /></div>, label: 'WeiPay 官方存管' },
              ].map(tab => (
                <Button
                  key={tab.key}
                  variant="ghost"
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 cursor-pointer h-auto ${
                    activeTab === tab.key ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  <span className="tracking-wide font-sans">{tab.label}</span>
                </Button>
              ))}
            </div>

            {/* 支付面板 */}
            <Card className="shadow-sm border border-border">
              <Card.Content className="p-8">
                {activeTab === 'alipay' && (
                  <div className="flex flex-col items-center text-center py-2 space-y-6">
                    <Button
                      isDisabled={switching}
                      onPress={() => handleInvokeRealGateway('alipay')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-[#1677ff] hover:bg-[#0e5ec8] text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{switching ? '正在接通官方网关...' : '直接前往支付宝官方收银台付款'}</span>
                    </Button>
                    <div className="flex items-center gap-4 w-full my-2">
                      <div className="h-[1px] bg-border flex-1" />
                      <span className="text-xs text-muted">或扫码付款</span>
                      <div className="h-[1px] bg-border flex-1" />
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                      <img src={qrUrl} alt="Alipay QR Code" className="w-48 h-48 object-contain" />
                    </div>
                    <div className="inline-flex items-center gap-2 bg-surface px-4 py-2 rounded-xl text-xs font-mono border border-border">
                      <span className="text-muted">附言:</span>
                      <span className="font-bold text-foreground">{remark}</span>
                      <Button isIconOnly variant="ghost" onPress={() => handleCopy(remark, 'remark')} aria-label="复制附言" className="hover:text-emerald-500 ml-1 h-auto min-h-0 min-w-0 p-0 bg-transparent cursor-pointer">
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
                      <p className="text-xs text-muted leading-relaxed">支持国际借记卡、信用卡及境外账户，系统自动货币汇兑。</p>
                    </div>
                    <Button
                      isDisabled={switching}
                      onPress={() => handleInvokeRealGateway('paypal')}
                      className="w-full py-3.5 px-6 bg-[#0079C1] hover:bg-[#005e96] text-white font-medium text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{switching ? '正在接通 PayPal...' : '前往 PayPal 安全结账'}</span>
                    </Button>
                  </div>
                )}

                {activeTab === 'bank' && (
                  <div className="py-2 font-sans">
                    <div className="flex justify-center mb-8">
                      <div className="inline-flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl border border-border shadow-inner">
                        <Button variant="ghost" onPress={() => setNativeMode('qrcode')} className={`py-2 px-6 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer h-auto ${nativeMode === 'qrcode' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold' : 'text-muted hover:text-foreground'}`}>
                          <QrCode className="w-4 h-4" /> 扫码极速结算
                        </Button>
                        <Button variant="ghost" onPress={() => setNativeMode('login')} className={`py-2 px-6 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer h-auto ${nativeMode === 'login' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold' : 'text-muted hover:text-foreground'}`}>
                          <Lock className="w-4 h-4" /> 钱包登录扣款
                        </Button>
                      </div>
                    </div>

                    {nativeMode === 'qrcode' ? (
                      <div className="flex flex-col items-center text-center py-4 space-y-6 max-w-sm mx-auto">
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                            <Zap className="w-4 h-4 text-emerald-500" /> WeiPay 沙盒客户端扫码直通
                          </h3>
                          <p className="text-xs text-muted leading-relaxed">使用 WeiPay 沙盒钱包 App 扫一扫完成付款。</p>
                        </div>
                        <div className="relative p-6 bg-white rounded-3xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 flex items-center justify-center group">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(window.location.origin + '/mobile-pay?orderNo=' + info.orderNo)}`}
                            alt="WeiPay QR Code"
                            className="w-52 h-52 object-contain relative z-10"
                          />
                        </div>
                        <div className="w-full pt-4 space-y-3">
                          <Button
                            onPress={() => setShowScannerModal(true)}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer tracking-wide font-sans"
                          >
                            <Smartphone className="w-4 h-4 fill-current" />
                            <span>模拟手机钱包 App 扫一扫</span>
                          </Button>
                          <div className="text-[11px] text-muted flex items-center justify-center gap-1 font-mono">
                            <span>附言：</span><span className="font-bold text-emerald-500">{remark}</span>
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
                            <label className="block text-[11px] font-semibold text-muted mb-1.5 font-mono uppercase tracking-wider">WeiPay 存管账号</label>
                            <TextField aria-label="存管账号" fullWidth>
                              <InputGroup className="w-full bg-background border border-border rounded-2xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-sm">
                                <InputGroup.Prefix><Smartphone className="w-4 h-4 text-muted ml-3.5" /></InputGroup.Prefix>
                                <InputGroup.Input type="text" value={walletUser} onChange={e => setWalletUser(e.target.value)} className="w-full bg-transparent pl-2.5 pr-4 py-3.5 text-xs text-foreground focus:outline-none font-mono font-medium" placeholder="请输入支付邮箱或手机号" />
                              </InputGroup>
                            </TextField>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-muted mb-1.5 font-mono uppercase tracking-wider">支付密码 (PIN)</label>
                            <TextField aria-label="支付密码" fullWidth>
                              <InputGroup className="w-full bg-background border border-border rounded-2xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-sm">
                                <InputGroup.Prefix><Lock className="w-4 h-4 text-muted ml-3.5" /></InputGroup.Prefix>
                                <InputGroup.Input type="password" value={walletPass} onChange={e => setWalletPass(e.target.value)} className="w-full bg-transparent pl-2.5 pr-4 py-3.5 text-xs text-foreground focus:outline-none font-mono tracking-widest" placeholder="请输入6位支付密码" />
                              </InputGroup>
                            </TextField>
                          </div>
                        </div>
                        <div className="pt-2 relative z-10">
                          <Button
                            isDisabled={payingNative}
                            onPress={handleNativePay}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider font-mono"
                          >
                            {payingNative ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                            <span>确认验证并扣款 ¥ {info.amount.toFixed(2)}</span>
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
          </div>
        </div>

        <ScannerModal
          isOpen={showScannerModal}
          onOpenChange={setShowScannerModal}
          orderNo={info.orderNo}
          amount={info.amount}
          onPaid={fetchInfo}
        />

        <footer className="mt-12 text-center text-[11px] text-muted font-mono">
          WeiPay Secure Gateway &copy; {new Date().getFullYear()} — Financial Grade Clearness
        </footer>
      </main>
    </div>
  )
}

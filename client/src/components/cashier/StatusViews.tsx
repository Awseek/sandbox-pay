import { Button, Card } from '@heroui/react'
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, Smartphone, Globe, Building2 } from 'lucide-react'
import type { CashierInfo } from '../dashboard/types'

export function PaidView({ info }: { info: CashierInfo }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12 font-sans selection:bg-emerald-500 selection:text-white">
      <Card className="max-w-md w-full rounded-3xl shadow-xl relative overflow-hidden">
        <Card.Content className="p-8">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="text-center pb-6 border-b border-border/80">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">支付成功</h2>
            <p className="text-muted text-xs mt-1">沙箱测试环境 · Sandbox Pay</p>
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
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">结算渠道</span>
              <span className="flex items-center gap-1.5 font-semibold font-mono">
                {info.payMethod === 'alipay' ? (
                  <span className="inline-flex items-center gap-1 text-[#1677ff] bg-[#1677ff]/10 border border-[#1677ff]/20 px-2.5 py-0.5 rounded-full text-[11px]">
                    <Smartphone className="w-3 h-3" /> 支付宝直连
                  </span>
                ) : info.payMethod === 'paypal' ? (
                  <span className="inline-flex items-center gap-1 text-[#0079C1] bg-[#0079C1]/10 border border-[#0079C1]/20 px-2.5 py-0.5 rounded-full text-[11px]">
                    <Globe className="w-3 h-3" /> PayPal 国际
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
                    <Building2 className="w-3 h-3" /> 网关快捷结算
                  </span>
                )}
              </span>
            </div>
            {info.thirdPartyTradeNo && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">网关核销凭据</span>
                <span className="font-mono text-foreground text-[11px] truncate max-w-[200px]" title={info.thirdPartyTradeNo}>{info.thirdPartyTradeNo}</span>
              </div>
            )}
            {info.payAt && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">核销清算时间</span>
                <span className="font-mono text-foreground text-[11px]">{new Date(info.payAt).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-border/80">
              <span className="text-muted text-xs font-semibold">实付总额</span>
              <span className="text-3xl font-bold text-emerald-500 font-mono tracking-tight">
                <span className="text-lg font-normal mr-1">¥</span>{info.amount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Button
              onPress={() => { window.location.href = '/admin' }}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
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

export function ExpiredFailedView({ info }: { info: CashierInfo }) {
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

export function ErrorView({ error }: { error: string }) {
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

export function LoadingView() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
      <div className="flex items-center gap-3 text-muted text-sm font-medium">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>正在加载收银台数据...</span>
      </div>
    </div>
  )
}

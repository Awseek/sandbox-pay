import { Button, Card } from '@heroui/react'
import { ShieldCheck, Clock, Copy, Check } from 'lucide-react'
import type { CashierInfo } from '../dashboard/types'

interface Props {
  info: CashierInfo
  countdown: string
  copied: string | null
  onCopy: (text: string, key: string) => void
}

export default function OrderInfoCard({ info, countdown, copied, onCopy }: Props) {
  return (
    <Card className="shadow-sm border border-border relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      <Card.Content className="p-6 sm:p-8">
        <div className="pb-6 border-b border-border/80">
          <div className="text-xs text-muted mb-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>收款方：Sandbox Pay（沙箱测试）</span>
          </div>
          <h1 className="text-base font-bold text-foreground mt-0.5">{info.productName}</h1>
        </div>

        <div className="py-6 border-b border-border/80 space-y-1">
          <span className="text-xs text-muted block">应收总额</span>
          <span className="text-3xl sm:text-4xl font-bold font-mono text-emerald-500">
            <span className="text-xl font-normal mr-1">¥</span>
            {info.amount.toFixed(2)}
          </span>
        </div>

        <div className="pt-5 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-mono text-muted min-w-0 flex-1">
            <span className="truncate" title={info.orderNo}>单号: {info.orderNo}</span>
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => onCopy(info.orderNo, 'orderNo')}
              aria-label="复制单号"
              className="hover:text-foreground inline-flex items-center gap-1 h-auto min-h-0 min-w-0 p-0 bg-transparent cursor-pointer shrink-0"
            >
              {copied === 'orderNo' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-1 text-amber-500 font-mono font-medium bg-amber-500/10 px-2.5 py-1 rounded-md whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>剩余 {countdown || '--:--'}</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

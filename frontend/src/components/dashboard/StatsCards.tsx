import { DollarSign, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card } from '@heroui/react'
import type { Stats } from './types'

interface Props {
  stats: Stats
}

/**
 * Three-card stat strip: total volume, successful count, success rate.
 *
 * Decorative metrics (gateway nodes, fake "<18ms latency", success-rate filler
 * subtitles) were removed because they competed with the real data for visual
 * weight on an empty account. Each card now shows just label + value.
 */
export default function StatsCards({ stats }: Props) {
  const items = [
    { title: '总交易额', val: stats.totalAmount, icon: DollarSign },
    { title: '成功单数', val: stats.successCount, icon: CheckCircle2 },
    { title: '支付成功率', val: stats.successRate, icon: TrendingUp },
  ] as const

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
      {items.map((stat, i) => (
        <Card key={i} className="p-5">
          <Card.Content className="p-0">
            <div className="flex items-center justify-between mb-3 text-muted">
              <span className="text-xs font-medium tracking-wide">{stat.title}</span>
              <stat.icon className="w-4 h-4 text-muted" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{stat.val}</h3>
          </Card.Content>
        </Card>
      ))}
    </section>
  )
}


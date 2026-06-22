import { Button, Chip, InputGroup, TextField, Table, Card } from '@heroui/react'
import {
  Search, ArrowUpRight, CheckCircle2, Clock, HandCoins, Undo2,
  Zap, AlertCircle, ArrowRight, Trash2,
} from 'lucide-react'
import type { Transaction } from './types'

function scrollToTestPay() {
  const el = document.getElementById('test-pay-panel')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface Props {
  transactions: Transaction[]
  search: string
  setSearch: (v: string) => void
  filterChannel: string
  setFilterChannel: (v: string) => void
  onConfirmNative: (t: Transaction) => void
  onOpenRefund: (t: Transaction) => void
  onDeleteTransaction: (t: Transaction) => void
}

const CHANNELS = ['ALL', 'ALIPAY', 'PAYPAL', 'NATIVE'] as const

const CHANNEL_LABEL: Record<string, string> = {
  ALL: '全部',
  ALIPAY: '支付宝',
  PAYPAL: 'PayPal',
  NATIVE: '官方存管',
}

export default function TransactionsTable({
  transactions,
  search,
  setSearch,
  filterChannel,
  setFilterChannel,
  onConfirmNative,
  onOpenRefund,
  onDeleteTransaction,
}: Props) {
  const filtered = transactions.filter(t => {
    const matchSearch = t.orderNo.toLowerCase().includes(search.toLowerCase())
    const matchChannel = filterChannel === 'ALL' || t.channel === filterChannel
    return matchSearch && matchChannel
  })

  // Surface "next action" hints inline so the table never sits as a row of
  // identical PENDING entries with no context.
  const hasAnyTransactions = transactions.length > 0
  const pendingNativeCount = transactions.filter(
    t => t.channel === 'NATIVE' && t.status === 'PENDING',
  ).length

  return (
    <Card className="p-6">
      <Card.Content className="p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
              实时交易流水
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono uppercase">Live</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">对接真实沙箱网关数据库</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-56">
              <TextField aria-label="搜索单号" fullWidth>
                <InputGroup className="w-full rounded-xl border border-border focus-within:border-emerald-500 transition-colors h-9">
                  <InputGroup.Prefix>
                    <Search className="w-3.5 h-3.5 text-muted" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    type="text"
                    placeholder="搜索单号..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="py-1.5 text-xs text-foreground bg-transparent w-full focus:outline-none"
                  />
                </InputGroup>
              </TextField>
            </div>

            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl h-9">
              {CHANNELS.map(ch => (
                <Button
                  key={ch}
                  size="sm"
                  variant={filterChannel === ch ? 'primary' : 'ghost'}
                  onPress={() => setFilterChannel(ch)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors h-7 cursor-pointer ${filterChannel === ch ? 'bg-emerald-500 text-white font-semibold shadow-sm' : 'text-muted hover:text-foreground'}`}
                >
                  {CHANNEL_LABEL[ch]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {!hasAnyTransactions && (
          <div className="mb-5 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">还没有任何交易</div>
                <div className="text-xs text-muted mt-0.5">使用右侧的「发起测试订单」体验完整支付链路</div>
              </div>
            </div>
            <Button
              onPress={scrollToTestPay}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              立即发起
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {hasAnyTransactions && pendingNativeCount > 0 && (
          <div className="mb-5 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs text-foreground">
                你有 <span className="font-semibold text-amber-600">{pendingNativeCount}</span> 笔
                <span className="font-mono"> NATIVE </span>
                待确认订单 — 沙箱场景下可在下方点击「确认收款」逐笔核销。
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm border border-dashed border-border rounded-xl">
              {hasAnyTransactions ? '没有匹配当前筛选条件的订单' : '暂无真实交易记录'}
            </div>
          ) : (
            <Table aria-label="实时交易流水表" className="w-full bg-transparent">
              <Table.ScrollContainer>
                <Table.Content>
                  <Table.Header>
                    <Table.Column>订单号</Table.Column>
                    <Table.Column>渠道</Table.Column>
                    <Table.Column>金额</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>时间</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body items={filtered}>
                    {t => (
                      <Table.Row key={t.id} className="group hover:bg-surface/50 transition-colors border-b border-border/60 last:border-none">
                        <Table.Cell className="py-3.5 font-mono text-xs text-foreground font-medium">
                          <span className="flex items-center gap-1.5">
                            {t.orderNo}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity" />
                          </span>
                        </Table.Cell>
                        <Table.Cell className="py-3.5 font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-surface text-muted font-medium">
                            {t.channel === 'NATIVE' ? '官方存管' : t.channel}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="py-3.5 font-mono font-semibold text-sm text-foreground">
                          ￥{Number(t.amount).toFixed(2)}
                        </Table.Cell>
                        <Table.Cell className="py-3.5">
                          <Chip
                            variant="soft"
                            size="sm"
                            className={
                              t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 font-semibold border-none' :
                              t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 font-semibold border-none' :
                              'bg-rose-500/10 text-rose-500 font-semibold border-none'
                            }
                          >
                            <span className="flex items-center gap-1 px-1 text-[10px] tracking-wide">
                              {t.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                              {t.status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {t.status}
                            </span>
                          </Chip>
                        </Table.Cell>
                        <Table.Cell className="py-3.5 text-xs text-muted font-mono">
                          {t.time}
                        </Table.Cell>
                        <Table.Cell className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            {t.channel === 'NATIVE' && t.status === 'PENDING' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => onConfirmNative(t)}
                                className="px-2.5 py-1 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors h-auto min-h-0 min-w-0 flex items-center gap-1 cursor-pointer"
                              >
                                <HandCoins className="w-3 h-3" />
                                确认收款
                              </Button>
                            ) : t.status === 'SUCCESS' && Number(t.amount || 0) - Number(t.refundedAmount || 0) > 0.01 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => onOpenRefund(t)}
                                className="px-2.5 py-1 text-[10px] font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors h-auto min-h-0 min-w-0 flex items-center gap-1 cursor-pointer"
                              >
                                <Undo2 className="w-3 h-3" />
                                退款
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted">—</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => onDeleteTransaction(t)}
                              aria-label="删除订单"
                              className="px-2 py-1 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors h-auto min-h-0 min-w-0 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}


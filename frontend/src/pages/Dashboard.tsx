import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Tooltip, InputGroup, TextField, Table } from '@heroui/react'
import { 
  Zap, DollarSign, Activity, CheckCircle2, RefreshCw, Key, 
  Copy, LogOut, Search, ArrowUpRight, ShieldCheck,
  TrendingUp, Clock, Check, Terminal, HandCoins
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'

interface Transaction {
  id: string
  orderNo: string
  channel: 'ALIPAY' | 'WECHAT' | 'PAYPAL' | 'USDT' | string
  amount: number
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | string
  time: string
}

interface Stats {
  totalAmount: string
  successCount: string
  routingCount: string
  successRate: string
}

interface MerchantInfo {
  name: string
  appKey: string
  appSecret: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()
  const toast = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAmount: '￥0.00',
    successCount: '0 笔',
    routingCount: '4 节点',
    successRate: '100.0%',
  })
  const [merchant, setMerchant] = useState<MerchantInfo>({
    name: 'WeiPay Sandbox Merchant',
    appKey: 'wp_sandbox_...',
    appSecret: '••••••••••••••••••••••••••••',
  })

  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState<string>('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  const loadRealData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [statsData, txsData, merchantData] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<Transaction[]>('/admin/transactions'),
        api.get<MerchantInfo>('/admin/merchant'),
      ])
      if (statsData) setStats(statsData)
      if (txsData) setTransactions(txsData)
      if (merchantData) setMerchant(merchantData)
      if (isRefresh) toast.success('数据已刷新至最新')
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('认证') || err.message.includes('登录') || err.message.includes('Failed to fetch') || err.message.includes('Unauthorized'))) {
        toast.error('认证过期，请重新登录')
        logout()
        navigate('/login')
      } else {
        toast.error('获取真实数据失败: ' + (err.message || '网络异常'))
      }
    } finally {
      if (isRefresh) setRefreshing(false)
    }
  }, [logout, navigate, toast])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token && !isLoggedIn) {
      toast.info('欢迎来到 WeiPay 控制台')
    }
    loadRealData()
  }, [isLoggedIn, loadRealData, toast])

  const handleRefresh = () => {
    loadRealData(true)
  }

  const handleResetSecret = async () => {
    try {
      const newMerchant = await api.post<MerchantInfo>('/admin/merchant/reset-secret')
      if (newMerchant) {
        setMerchant(newMerchant)
        toast.success('已生成全新的商户签名私钥 (AppSecret)')
      }
    } catch (err: any) {
      toast.error('重置密钥失败: ' + (err.message || '网络异常'))
    }
  }

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    toast.success(`${type} 已复制到剪贴板`)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const filteredTxs = transactions.filter(t => {
    const matchSearch = t.orderNo.toLowerCase().includes(search.toLowerCase())
    const matchChannel = filterChannel === 'ALL' || t.channel === filterChannel
    return matchSearch && matchChannel
  })

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans pb-16">
      {/* 导航栏 - 极简高雅 */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-foreground">
                  WeiPay Admin
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-mono uppercase tracking-wider font-semibold">
                  Sandbox
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  variant="ghost"
                  onPress={handleRefresh}
                  isDisabled={refreshing}
                  aria-label="刷新实时数据"
                  className="rounded-xl border border-border text-foreground h-9 w-9 min-w-9 bg-transparent hover:border-foreground transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : 'text-muted'}`} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content className="bg-foreground text-background px-2 py-1 rounded text-xs">
                刷新实时数据
              </Tooltip.Content>
            </Tooltip>

            <div className="h-4 w-[1px] bg-border mx-1" />

            <Button
              onPress={() => {
                logout()
                toast.info('已退出控制台')
                navigate('/login')
              }}
              variant="ghost"
              className="px-3 py-1.5 text-muted hover:text-rose-500 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* 数据统计概览 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { title: '总交易额', val: stats.totalAmount, change: '实时汇总', isUp: true, icon: DollarSign },
            { title: '成功单数', val: stats.successCount, change: '真实流水', isUp: true, icon: CheckCircle2 },
            { title: '网关路由节点', val: stats.routingCount, sub: '延迟 < 18ms', icon: Activity },
            { title: '支付成功率', val: stats.successRate, sub: '异常自动重试中', icon: TrendingUp }
          ].map((stat, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3 text-muted">
                <span className="text-xs font-medium tracking-wide">{stat.title}</span>
                <stat.icon className="w-4 h-4 text-muted" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stat.val}</h3>
                {stat.change && (
                  <span className="text-[10px] font-medium text-muted bg-surface px-2 py-0.5 rounded font-mono">
                    {stat.change}
                  </span>
                )}
                {stat.sub && <span className="text-[10px] text-muted font-mono">{stat.sub}</span>}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：流水列表 */}
          <section className="lg:col-span-2 space-y-6">
            <div className="card p-6">
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
                    {['ALL', 'ALIPAY', 'PAYPAL', 'NATIVE', 'USDT'].map(ch => (
                      <Button
                        key={ch}
                        size="sm"
                        variant={filterChannel === ch ? 'primary' : 'ghost'}
                        onPress={() => setFilterChannel(ch)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono transition-colors h-7 ${filterChannel === ch ? 'bg-emerald-500 text-white font-semibold shadow-sm' : 'text-muted hover:text-foreground'}`}
                      >
                        {ch}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredTxs.length === 0 ? (
                  <div className="py-12 text-center text-muted text-sm border border-dashed border-border rounded-xl">
                    暂无真实交易记录
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
                        <Table.Body items={filteredTxs}>
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
                                  {t.channel}
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
                                {t.channel === 'NATIVE' && t.status === 'PENDING' ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onPress={async () => {
                                      try {
                                        await api.post('/native-pay/confirm', { orderNo: t.orderNo })
                                        toast.success(`订单 ${t.orderNo} 已确认收款`)
                                        loadRealData(true)
                                      } catch (err: any) {
                                        toast.error('确认失败: ' + (err.message || '网络异常'))
                                      }
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors h-auto min-h-0 min-w-0 flex items-center gap-1"
                                  >
                                    <HandCoins className="w-3 h-3" />
                                    确认收款
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted">—</span>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          )}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                )}
              </div>
            </div>
          </section>

          {/* 右侧：配置与支持 - 极其清透优雅的翡翠绿高阶设计 */}
          <section className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground tracking-tight">商户密钥鉴权</h3>
                  <p className="text-xs text-muted">调用 WeiPay API 必备鉴权参数</p>
                </div>
              </div>

              <div className="space-y-5 font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-muted" />
                      AppKey (应用 ID)
                    </span>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onPress={() => handleCopy(merchant.appKey, 'AppKey')}
                      className="text-xs text-emerald-500 hover:text-emerald-600 flex items-center gap-1 px-2 py-1 h-auto min-w-0 min-h-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      复制
                    </Button>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface/80 text-xs select-all text-foreground font-medium tracking-wider overflow-x-auto">
                    {merchant.appKey}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-muted" />
                      AppSecret (签名私钥)
                    </span>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onPress={() => handleCopy(merchant.appSecret, 'AppSecret')}
                      className="text-xs text-muted hover:text-foreground flex items-center gap-1 px-2 py-1 h-auto min-w-0 min-h-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </Button>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface/80 text-muted flex items-center justify-between">
                    <span className="truncate max-w-[180px]">
                      {merchant.appSecret ? merchant.appSecret.substring(0, 16) + '...' : '••••••••••••••••'}
                    </span>
                    <span className="text-[10px] bg-background text-muted px-2 py-0.5 rounded font-mono shadow-xs">
                      HMAC-256
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  onPress={handleResetSecret}
                  variant="secondary"
                  className="w-full py-3 bg-surface hover:bg-surface-secondary text-foreground font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted" />
                  重新生成私钥
                </Button>
              </div>
            </div>

            <div className="card p-6 bg-surface">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-foreground">
                <Terminal className="w-4 h-4 text-emerald-500" />
                开发者支持
              </h3>
              <p className="text-xs text-muted mb-5 leading-relaxed">
                查看全套 SDK 接入规范、Webhook 重试策略与沙箱联调指南。
              </p>
              <Button
                onPress={() => navigate('/#api')}
                variant="primary"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                查看 API 接口规范
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

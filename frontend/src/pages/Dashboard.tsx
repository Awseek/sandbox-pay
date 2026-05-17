import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../utils/api'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import StatsCards from '../components/dashboard/StatsCards'
import TransactionsTable from '../components/dashboard/TransactionsTable'
import MerchantKeyPanel from '../components/dashboard/MerchantKeyPanel'
import TestPayPanel from '../components/dashboard/TestPayPanel'
import RefundDialog from '../components/dashboard/RefundDialog'
import DeleteConfirmDialog from '../components/dashboard/DeleteConfirmDialog'
import type {
  Transaction,
  TransactionsResponse,
  Stats,
  MerchantInfo,
} from '../components/dashboard/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()
  const toast = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAmount: '-',
    successCount: '-',
    successRate: '-',
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
  const [activeTab, setActiveTab] = useState<'orders' | 'sandbox'>('orders')

  // Refund dialog state. Held outside the table row so the modal survives
  // re-renders triggered by `loadRealData()`.
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)

  // Delete dialog state.
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const loadRealData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [statsData, txsData, merchantData] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<TransactionsResponse>('/admin/transactions'),
        api.get<MerchantInfo>('/admin/merchant'),
      ])
      if (statsData) setStats(statsData)
      // Backend now returns a paginated envelope; gracefully accept the legacy
      // array shape too so a stale backend doesn't break the dashboard.
      if (txsData) {
        const items = Array.isArray(txsData) ? txsData : (txsData.items ?? [])
        setTransactions(items)
      }
      if (merchantData) setMerchant(merchantData)
      if (isRefresh) toast.success('数据已刷新至最新')
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('认证过期，请重新登录')
        logout()
        navigate('/login')
      } else {
        const message = err instanceof Error ? err.message : '网络异常'
        toast.error('获取真实数据失败: ' + message)
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

  const handleRefresh = () => loadRealData(true)

  const handleLogout = () => {
    logout()
    toast.info('已退出控制台')
    navigate('/login')
  }

  const handleResetSecret = async () => {
    try {
      const newMerchant = await api.post<MerchantInfo>('/admin/merchant/reset-secret')
      if (newMerchant) {
        setMerchant(newMerchant)
        toast.success('已生成全新的商户签名私钥 (AppSecret)')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络异常'
      toast.error('重置密钥失败: ' + message)
    }
  }

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    toast.success(`${type} 已复制到剪贴板`)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleConfirmNative = async (t: Transaction) => {
    try {
      await api.post('/native-pay/confirm', { orderNo: t.orderNo })
      toast.success(`订单 ${t.orderNo} 已确认收款`)
      loadRealData(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络异常'
      toast.error('确认失败: ' + message)
    }
  }

  const openRefundDialog = (t: Transaction) => {
    const refundable = Math.max(0, Number(t.amount || 0) - Number(t.refundedAmount || 0))
    setRefundTarget(t)
    setRefundAmount(refundable.toFixed(2))
    setRefundReason('')
  }

  const closeRefundDialog = () => {
    if (refundSubmitting) return
    setRefundTarget(null)
    setRefundAmount('')
    setRefundReason('')
  }

  const submitRefund = async () => {
    if (!refundTarget) return
    const amountNum = Number(refundAmount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('请输入正确的退款金额')
      return
    }
    const refundable = Number(refundTarget.amount || 0) - Number(refundTarget.refundedAmount || 0)
    if (amountNum - refundable > 0.01) {
      toast.error(`退款金额超出可退余额 ￥${refundable.toFixed(2)}`)
      return
    }
    setRefundSubmitting(true)
    try {
      await api.post('/admin/refund', {
        orderNo: refundTarget.orderNo,
        amount: amountNum,
        reason: refundReason || undefined,
      })
      toast.success(`订单 ${refundTarget.orderNo} 已发起退款`)
      setRefundTarget(null)
      setRefundAmount('')
      setRefundReason('')
      loadRealData(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络异常'
      toast.error('退款失败: ' + message)
    } finally {
      setRefundSubmitting(false)
    }
  }

  const openDeleteDialog = (t: Transaction) => {
    setDeleteTarget(t)
  }

  const closeDeleteDialog = () => {
    if (deleteSubmitting) return
    setDeleteTarget(null)
  }

  const submitDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      await api.delete(`/admin/transactions/${deleteTarget.orderNo}`)
      toast.success(`订单 ${deleteTarget.orderNo} 已成功抹除`)
      setDeleteTarget(null)
      loadRealData(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络异常'
      toast.error('删除订单失败: ' + message)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans pb-16">
      <DashboardHeader
        refreshing={refreshing}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {activeTab === 'orders' ? (
          <div className="space-y-8">
            <StatsCards stats={stats} />
            <TransactionsTable
              transactions={transactions}
              search={search}
              setSearch={setSearch}
              filterChannel={filterChannel}
              setFilterChannel={setFilterChannel}
              onConfirmNative={handleConfirmNative}
              onOpenRefund={openRefundDialog}
              onDeleteTransaction={openDeleteDialog}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="border-b border-border pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">开发与联调沙箱</h2>
              <p className="text-sm text-muted mt-1">管理应用凭证密钥，模拟真实支付链路体验</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <MerchantKeyPanel
                merchant={merchant}
                copiedKey={copiedKey}
                onCopy={handleCopy}
                onResetSecret={handleResetSecret}
              />
              <TestPayPanel />
            </div>
          </div>
        )}
      </main>

      <RefundDialog
        target={refundTarget}
        amount={refundAmount}
        setAmount={setRefundAmount}
        reason={refundReason}
        setReason={setRefundReason}
        submitting={refundSubmitting}
        onClose={closeRefundDialog}
        onSubmit={submitRefund}
      />

      <DeleteConfirmDialog
        target={deleteTarget}
        submitting={deleteSubmitting}
        onClose={closeDeleteDialog}
        onSubmit={submitDelete}
      />
    </div>
  )
}

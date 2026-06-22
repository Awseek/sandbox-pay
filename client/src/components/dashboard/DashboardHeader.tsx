import { Button, ButtonGroup, Tooltip } from '@heroui/react'
import { Zap, RefreshCw, LogOut, ListOrdered, Key } from 'lucide-react'
import ThemeToggle from '../ThemeToggle'

interface Props {
  refreshing: boolean
  activeTab?: 'orders' | 'sandbox'
  onTabChange?: (tab: 'orders' | 'sandbox') => void
  onRefresh: () => void
  onLogout: () => void
}

export default function DashboardHeader({ refreshing, activeTab = 'orders', onTabChange, onRefresh, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-foreground">WeiPay Admin</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-mono uppercase tracking-wider font-semibold">
                Sandbox
              </span>
            </div>
          </div>
        </div>

        <ButtonGroup className="bg-surface border border-border p-1 rounded-xl shadow-xs gap-1">
          <Button
            size="sm"
            variant={activeTab === 'orders' ? 'primary' : 'ghost'}
            onPress={() => onTabChange?.('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer h-auto min-h-0 ${
              activeTab === 'orders'
                ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                : 'text-muted hover:text-foreground hover:bg-surface-secondary/50'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />订单管理
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'sandbox' ? 'primary' : 'ghost'}
            onPress={() => onTabChange?.('sandbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer h-auto min-h-0 ${
              activeTab === 'sandbox'
                ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                : 'text-muted hover:text-foreground hover:bg-surface-secondary/50'
            }`}
          >
            <Key className="w-3.5 h-3.5" />开发与沙箱
          </Button>
        </ButtonGroup>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Tooltip>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                variant="ghost"
                onPress={onRefresh}
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
            onPress={onLogout}
            variant="ghost"
            className="px-3 py-1.5 text-muted hover:text-rose-500 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 h-9"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出
          </Button>
        </div>
      </div>
    </header>
  )
}


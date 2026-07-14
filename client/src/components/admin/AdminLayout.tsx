import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Tooltip } from '@heroui/react'
import {
  Zap, LayoutDashboard, ListOrdered, Store, Bell, ScrollText,
  Key, LogOut, ChevronLeft, ChevronRight, RefreshCw, Menu, FileSpreadsheet, Settings,
} from 'lucide-react'
import ThemeToggle from '../ThemeToggle'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  key: string
  label: string
  icon: typeof LayoutDashboard
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: '总览', icon: LayoutDashboard, path: '/admin' },
  { key: 'orders', label: '订单管理', icon: ListOrdered, path: '/admin/orders' },
  { key: 'merchants', label: '商户管理', icon: Store, path: '/admin/merchants' },
  { key: 'notifications', label: '通知队列', icon: Bell, path: '/admin/notifications' },
  { key: 'reconciliation', label: '对账管理', icon: FileSpreadsheet, path: '/admin/reconciliation' },
  { key: 'audit', label: '审计日志', icon: ScrollText, path: '/admin/audit' },
  { key: 'settings', label: '站点设置', icon: Settings, path: '/admin/settings' },
  { key: 'sandbox', label: '开发沙箱', icon: Key, path: '/admin/sandbox' },
]

interface Props {
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
  title?: string
  subtitle?: string
  actions?: ReactNode
}

export default function AdminLayout({
  children,
  refreshing = false,
  onRefresh,
  title,
  subtitle,
  actions,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, role, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentPath = location.pathname

  const isActive = (item: NavItem) => {
    if (item.path === '/admin') return currentPath === '/admin'
    return currentPath.startsWith(item.path)
  }

  const handleNav = (item: NavItem) => {
    navigate(item.path)
    setMobileOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen flex flex-col
          bg-surface border-r border-border transition-all duration-300
          ${collapsed ? 'w-[68px]' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap">Sandbox Pay</div>
              <div className="text-[10px] text-muted font-mono uppercase tracking-wider">Admin Console</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item)
            const Icon = item.icon
            const btn = (
              <button
                key={item.key}
                onClick={() => handleNav(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer
                  ${active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-muted hover:text-foreground hover:bg-surface-secondary/50'
                  }
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-500' : ''}`} />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.key}>
                  <Tooltip.Trigger>{btn}</Tooltip.Trigger>
                  <Tooltip.Content className="bg-foreground text-background px-2 py-1 rounded text-xs">
                    {item.label}
                  </Tooltip.Content>
                </Tooltip>
              )
            }
            return btn
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border p-2 space-y-1 shrink-0">
          {collapsed ? (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  variant="ghost"
                  onPress={() => setCollapsed(false)}
                  className="w-full rounded-xl text-muted hover:text-foreground h-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content className="bg-foreground text-background px-2 py-1 rounded text-xs">展开侧栏</Tooltip.Content>
            </Tooltip>
          ) : (
            <button
              onClick={() => setCollapsed(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted hover:text-foreground hover:bg-surface-secondary/50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>收起侧栏</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-60'}`}>
        {/* Top header bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => setMobileOpen(true)}
              className="lg:hidden rounded-xl text-muted h-9 w-9"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {title && (
              <div>
                <h1 className="text-base font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {onRefresh && (
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    variant="ghost"
                    onPress={onRefresh}
                    isDisabled={refreshing}
                    aria-label="刷新数据"
                    className="rounded-xl border border-border text-foreground h-9 w-9 min-w-9 bg-transparent hover:border-foreground"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : 'text-muted'}`} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content className="bg-foreground text-background px-2 py-1 rounded text-xs">刷新数据</Tooltip.Content>
              </Tooltip>
            )}

            <ThemeToggle />

            {username && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground hidden sm:inline">{username}</span>
                {role && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-mono uppercase tracking-wider font-semibold">
                    {role}
                  </span>
                )}
              </div>
            )}

            <Button
              onPress={handleLogout}
              variant="ghost"
              className="px-3 py-1.5 text-muted hover:text-rose-500 rounded-xl text-xs font-medium flex items-center gap-1.5 h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

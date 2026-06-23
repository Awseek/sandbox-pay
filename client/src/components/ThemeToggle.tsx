import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { Button, Tooltip } from '@heroui/react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button
          isIconOnly
          variant="ghost"
          onPress={toggleTheme}
          aria-label={`切换至${theme === 'dark' ? '日间' : '夜间'}模式`}
          className="relative rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground hover:scale-105 active:scale-95 shadow-sm group overflow-hidden h-10 w-10 min-w-10"
        >
          <span className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 pointer-events-none" />
          <div className="relative flex items-center justify-center w-5 h-5">
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
          </div>
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content className="bg-black/90 text-white px-2 py-1 rounded text-xs">
        切换至{theme === 'dark' ? '日间' : '夜间'}模式
      </Tooltip.Content>
    </Tooltip>
  )
}

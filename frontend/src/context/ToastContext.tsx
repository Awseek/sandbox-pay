import { createContext, useContext, type ReactNode } from 'react'
import { toast } from '@heroui/react'

interface ToastContextType {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const toastMethods: ToastContextType = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.danger(msg),
  info: (msg) => toast.info(msg),
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

import { Button, Modal } from '@heroui/react'
import { QrCode, ShieldCheck, Zap, RefreshCw, Check } from 'lucide-react'
import { api } from '../../utils/api'
import { showToast as toast } from '../../utils/toast'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  orderNo: string
  amount: number
  onPaid: () => void
}

export default function ScannerModal({ isOpen, onOpenChange, orderNo, amount, onPaid }: Props) {
  const [step, setStep] = useState<'scanning' | 'confirm' | 'success'>('scanning')
  const [paying, setPaying] = useState(false)

  const handleOpen = (open: boolean) => {
    if (open) {
      setStep('scanning')
      setTimeout(() => setStep('confirm'), 1200)
    }
    onOpenChange(open)
  }

  const handleConfirm = async () => {
    setPaying(true)
    try {
      await api.post('/native-pay/sandbox-confirm', {
        orderNo,
        walletUser: 'app_scan@sandbox-pay.local',
        walletPass: '123456',
      })
      setStep('success')
      setTimeout(() => {
        onOpenChange(false)
        onPaid()
      }, 1200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '该单据不可通过存管网关核销'
      toast.error('通道清算驳回: ' + message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpen} variant="blur">
        <Modal.Container size="xs">
          <Modal.Dialog className="bg-neutral-900 border-4 border-neutral-700 p-6 text-white shadow-2xl rounded-[40px] overflow-hidden flex flex-col items-center">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-800 rounded-b-xl flex items-center justify-center">
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
            </div>

            <Modal.Header className="w-full flex items-center justify-between pt-4 pb-2 border-b border-neutral-800 text-xs px-0">
              <Modal.Heading className="font-semibold tracking-wide text-neutral-300">Sandbox Pay App - 扫一扫</Modal.Heading>
              <Modal.CloseTrigger className="text-neutral-400 hover:text-white text-sm font-bold p-1 cursor-pointer h-auto min-h-0 min-w-0 bg-transparent" />
            </Modal.Header>

            <Modal.Body className="w-full py-8 flex flex-col items-center text-center min-h-[280px] justify-center space-y-4 px-0">
              {step === 'scanning' && (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="relative w-40 h-40 border-2 border-dashed border-emerald-500 rounded-3xl flex items-center justify-center p-2 animate-pulse">
                    <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-[bounce_2s_infinite]" />
                    <QrCode className="w-20 h-20 text-emerald-500/50" />
                  </div>
                  <div className="text-xs text-neutral-400 font-mono tracking-wider animate-pulse">
                    正在对准付款码识别中...
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-5 w-full px-2 animate-scale-up">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-neutral-400">支付给</div>
                    <div className="font-bold text-base tracking-tight text-white">Sandbox Pay 官方存管清算网关</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400 pt-1">¥ {amount.toFixed(2)}</div>
                  </div>
                  <div className="bg-neutral-800/80 rounded-2xl p-3.5 text-left text-[11px] space-y-2 border border-neutral-700/50 font-mono">
                    <div className="flex justify-between text-neutral-400 pb-1.5 border-b border-neutral-700/50">
                      <span>付款单号：</span>
                      <span className="text-neutral-200 truncate max-w-[140px]">{orderNo}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>扣款账户：</span>
                      <span className="text-emerald-400 font-bold">沙箱模拟钱包 (可用 ¥88,888.00)</span>
                    </div>
                  </div>
                  <Button
                    isDisabled={paying}
                    onPress={handleConfirm}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wider"
                  >
                    {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    <span>确认向商户付款</span>
                  </Button>
                </div>
              )}

              {step === 'success' && (
                <div className="space-y-4 flex flex-col items-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_#34d399] animate-bounce">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">支付核销成功！</div>
                  <div className="text-xs text-emerald-400 font-mono">正在同步通知收银台...</div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-center pb-0 pt-2 px-0">
              <div className="w-32 h-1 bg-neutral-700 rounded-full" />
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

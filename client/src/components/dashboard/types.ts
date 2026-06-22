export interface Transaction {
  id: string
  orderNo: string
  channel: 'ALIPAY' | 'WECHAT' | 'PAYPAL' | 'USDT' | 'NATIVE'
  payMethod?: string
  amount: number
  refundedAmount?: number
  fee?: number
  settleAmount?: number
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDING' | 'REFUNDED'
  time: string
}

export interface TransactionsResponse {
  items: Transaction[]
  total: number
  page: number
  pageSize: number
}

export interface Stats {
  totalAmount: string
  successCount: string
  successRate: string
}

export interface MerchantInfo {
  name: string
  appKey: string
  appSecret: string
}

export interface CashierInfo {
  orderNo: string
  amount: number
  productName: string
  status: 'pending' | 'paid' | 'expired' | 'failed'
  payMethod?: string
  thirdPartyTradeNo?: string
  expireAt?: string
  payAt?: string
  paymentInfo?: {
    qrCodeUrl: string
    remark: string
  }
}

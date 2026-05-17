export interface Transaction {
  id: string
  orderNo: string
  channel: 'ALIPAY' | 'WECHAT' | 'PAYPAL' | 'USDT' | 'NATIVE' | string
  payMethod?: string
  amount: number
  refundedAmount?: number
  fee?: number
  settleAmount?: number
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDING' | 'REFUNDED' | string
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

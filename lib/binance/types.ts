/**
 * Binance API Type Definitions
 *
 * REST API v3 types for:
 * - Market data (prices, tickers)
 * - Account info (balances)
 * - Order placement & results
 */

// ─── Market Data ───

export interface BinanceTicker {
  symbol: string   // e.g. "BTCUSDT"
  price: string    // e.g. "94285.40000000"
}

export interface Binance24hrTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
}

// ─── Account ───

export interface BinanceBalance {
  asset: string    // e.g. "BTC"
  free: string     // available
  locked: string   // in orders
}

export interface BinanceAccountInfo {
  balances: BinanceBalance[]
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
}

// ─── Orders ───

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED'

export interface BinanceOrderResult {
  symbol: string
  orderId: number
  clientOrderId: string
  transactTime: number
  price: string
  origQty: string
  executedQty: string
  cummulativeQuoteQty: string   // total USD spent/received
  status: OrderStatus
  type: OrderType
  side: OrderSide
  fills: BinanceOrderFill[]
}

export interface BinanceOrderFill {
  price: string
  qty: string
  commission: string
  commissionAsset: string
}

// ─── Internal App Types ───

export interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
  updatedAt: string
}

export interface CryptoHolding {
  id: string
  symbol: string
  amount: number
  avgBuyPrice: number
  updatedAt: string
}

export interface CryptoTrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  cryptoAmount: number
  pricePerCoin: number
  quoteAmount: number
  feeAmount: number
  status: string
  binanceOrderId: string | null
  createdAt: string
}

export interface TradeResult {
  tradeId: string
  symbol: string
  side: 'buy' | 'sell'
  cryptoAmount: number
  pricePerCoin: number
  quoteAmount: number
  feeAmount: number
  newWalletBalance: number
}

/** Coins supported for trading (must have USDT pair on Binance) */
export const SUPPORTED_TRADING_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  AVAX: 'AVAXUSDT',
  // USDT and USDC don't need trading — they ARE stablecoins
}

/** Minimum trade amounts per coin (Binance LOT_SIZE filters) */
export const MIN_TRADE_QTY: Record<string, number> = {
  BTC: 0.00001,
  ETH: 0.0001,
  SOL: 0.01,
  BNB: 0.001,
  XRP: 0.1,
  ADA: 1,
  AVAX: 0.01,
}

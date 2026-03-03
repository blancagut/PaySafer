/**
 * Binance REST API Client (Server-side only)
 *
 * Singleton pattern mirroring lib/stripe/server.ts.
 * HMAC-SHA256 signed requests following the same crypto primitives
 * used in lib/webhooks/crypto.ts.
 *
 * Environment variables:
 *   BINANCE_API_KEY        — API key from Binance dashboard
 *   BINANCE_API_SECRET     — Secret key from Binance dashboard
 *   USE_BINANCE_TESTNET    — "true" to use Spot Test Network
 *
 * ⚠️  NEVER import this file from client components.
 */

import { createHmac } from 'crypto'
import type {
  BinanceTicker,
  Binance24hrTicker,
  BinanceAccountInfo,
  BinanceOrderResult,
  OrderSide,
} from './types'

// ─── Environment guard (mirrors lib/stripe/server.ts pattern) ───

if (!process.env.BINANCE_API_KEY) {
  console.warn(
    '[Binance] Missing BINANCE_API_KEY environment variable. ' +
    'Crypto trading features will be unavailable. ' +
    'Add BINANCE_API_KEY and BINANCE_API_SECRET to .env.local.'
  )
}

// ─── Base URLs ───

const PROD_BASE = 'https://api.binance.com'
const TESTNET_BASE = 'https://testnet.binance.vision'

/** Use production for public/price data (always available), testnet only for signed/trading */
function getBaseUrl(forceProduction = false): string {
  if (forceProduction) return PROD_BASE
  return process.env.USE_BINANCE_TESTNET === 'true' ? TESTNET_BASE : PROD_BASE
}

// ─── HMAC-SHA256 Signing ───

function sign(queryString: string, secret: string): string {
  return createHmac('sha256', secret).update(queryString).digest('hex')
}

// ─── Helpers ───

function getApiKey(): string {
  const key = process.env.BINANCE_API_KEY
  if (!key) throw new Error('BINANCE_API_KEY is not configured')
  return key
}

function getApiSecret(): string {
  const secret = process.env.BINANCE_API_SECRET
  if (!secret) throw new Error('BINANCE_API_SECRET is not configured')
  return secret
}

async function publicGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  // Always use production Binance for public data — testnet has very limited pairs/data
  const url = new URL(`${getBaseUrl(true)}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 }, // never cache in Next.js
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[Binance] Public API error ${res.status}: ${body} — URL: ${url.toString()}`)
    throw new Error(`Binance API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

async function signedRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = getApiKey()
  const apiSecret = getApiSecret()
  const timestamp = Date.now().toString()

  const queryParams = { ...params, timestamp }
  const queryString = new URLSearchParams(queryParams).toString()
  const signature = sign(queryString, apiSecret)

  const url = `${getBaseUrl()}${endpoint}?${queryString}&signature=${signature}`

  const res = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[Binance] Signed API error ${res.status}: ${body}`)
    throw new Error(`Binance API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ═══════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no API key needed)
// ═══════════════════════════════════════════════════════

/**
 * Get current price for a single symbol.
 * GET /api/v3/ticker/price?symbol=BTCUSDT
 */
export async function getPrice(symbol: string): Promise<BinanceTicker> {
  return publicGet<BinanceTicker>('/api/v3/ticker/price', { symbol })
}

/**
 * Get prices for multiple symbols.
 * GET /api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT"]
 */
export async function getPrices(symbols: string[]): Promise<BinanceTicker[]> {
  return publicGet<BinanceTicker[]>('/api/v3/ticker/price', {
    symbols: JSON.stringify(symbols),
  })
}

/**
 * Get 24hr price change statistics.
 * GET /api/v3/ticker/24hr?symbol=BTCUSDT
 */
export async function get24hrTicker(symbol: string): Promise<Binance24hrTicker> {
  return publicGet<Binance24hrTicker>('/api/v3/ticker/24hr', { symbol })
}

/**
 * Get 24hr tickers for multiple symbols.
 * GET /api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]
 */
export async function get24hrTickers(symbols: string[]): Promise<Binance24hrTicker[]> {
  return publicGet<Binance24hrTicker[]>('/api/v3/ticker/24hr', {
    symbols: JSON.stringify(symbols),
  })
}

// ═══════════════════════════════════════════════════════
// SIGNED ENDPOINTS (require API key + secret)
// ═══════════════════════════════════════════════════════

/**
 * Get account info including all balances.
 * GET /api/v3/account (SIGNED)
 */
export async function getAccountInfo(): Promise<BinanceAccountInfo> {
  return signedRequest<BinanceAccountInfo>('GET', '/api/v3/account')
}

/**
 * Place a market buy order using USD amount (quoteOrderQty).
 * User says "buy $100 of BTC" → we send quoteOrderQty=100.
 * Binance fills as much BTC as $100 buys.
 *
 * POST /api/v3/order (SIGNED)
 */
export async function marketBuy(
  symbol: string,
  quoteOrderQty: number
): Promise<BinanceOrderResult> {
  return signedRequest<BinanceOrderResult>('POST', '/api/v3/order', {
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quoteOrderQty: quoteOrderQty.toFixed(2),
  })
}

/**
 * Place a market sell order using coin quantity.
 * User says "sell 0.001 BTC" → we send quantity=0.001.
 *
 * POST /api/v3/order (SIGNED)
 */
export async function marketSell(
  symbol: string,
  quantity: number,
  stepSize: number = 0.00001
): Promise<BinanceOrderResult> {
  // Round down to Binance's step size to avoid LOT_SIZE filter errors
  const precision = Math.max(0, -Math.floor(Math.log10(stepSize)))
  const roundedQty = Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision)

  return signedRequest<BinanceOrderResult>('POST', '/api/v3/order', {
    symbol,
    side: 'SELL',
    type: 'MARKET',
    quantity: roundedQty.toFixed(precision),
  })
}

/**
 * Check order status.
 * GET /api/v3/order (SIGNED)
 */
export async function getOrderStatus(
  symbol: string,
  orderId: number
): Promise<BinanceOrderResult> {
  return signedRequest<BinanceOrderResult>('GET', '/api/v3/order', {
    symbol,
    orderId: orderId.toString(),
  })
}

/**
 * Test connectivity — useful for health checks.
 * GET /api/v3/ping
 */
export async function ping(): Promise<boolean> {
  try {
    await publicGet('/api/v3/ping')
    return true
  } catch {
    return false
  }
}

/**
 * Get server time — useful for clock sync debugging.
 * GET /api/v3/time
 */
export async function getServerTime(): Promise<number> {
  const data = await publicGet<{ serverTime: number }>('/api/v3/time')
  return data.serverTime
}

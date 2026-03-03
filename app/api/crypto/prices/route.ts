import { NextResponse } from 'next/server'
import { getCryptoPrices } from '@/lib/actions/crypto'

/**
 * GET /api/crypto/prices
 *
 * Returns cached crypto prices. Refreshes from Binance if stale (>15s).
 * Called by the crypto page every 10s for live price updates.
 *
 * Rate limited to 30/min per IP via middleware.
 */
export async function GET() {
  try {
    const result = await getCryptoPrices()

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { prices: result.data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

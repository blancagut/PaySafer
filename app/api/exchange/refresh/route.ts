import { NextResponse } from "next/server"

/**
 * On-demand exchange rate refresh endpoint.
 * Can be called from the exchange page or admin panel.
 * Uses 4 Alpha Vantage API calls.
 */
export async function POST() {
  try {
    const { refreshExchangeRatesFromAlphaVantage } = await import("@/lib/actions/exchange")
    await refreshExchangeRatesFromAlphaVantage()
    return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() })
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    )
  }
}

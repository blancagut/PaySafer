import { NextResponse } from "next/server"

/**
 * Cron endpoint — refreshes ALL cached market data from Alpha Vantage.
 *
 * Expected to be called ~2× per day via an external scheduler (Vercel cron, GitHub Actions, etc.)
 *
 * Budget per call:
 *   Crypto      → 7  (one per coin)
 *   Forex       → 4  (one per pair)
 *   Commodities → 2  (gold via XAU/USD, oil via WTI endpoint)
 *   Economic    → 6  (GDP, CPI, inflation, unemployment, fed rate, treasury yield)
 *   News        → 1
 *   Total       ≈ 20 calls — fits into the 25/day free tier when run once, tight for 2×.
 *
 * Protected by `CRON_SECRET` env var.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, string> = {}

  // 1. Crypto prices (7 calls)
  try {
    const { refreshPricesFromAlphaVantage } = await import("@/lib/actions/crypto")
    await refreshPricesFromAlphaVantage()
    results.crypto = "ok"
  } catch (e: unknown) {
    results.crypto = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  // 2. Forex / exchange rates (4 calls)
  try {
    const { refreshExchangeRatesFromAlphaVantage } = await import("@/lib/actions/exchange")
    await refreshExchangeRatesFromAlphaVantage()
    results.forex = "ok"
  } catch (e: unknown) {
    results.forex = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  // 3. Commodities (2-4 calls)
  try {
    const { refreshCommodityPrices } = await import("@/lib/actions/commodities")
    await refreshCommodityPrices()
    results.commodities = "ok"
  } catch (e: unknown) {
    results.commodities = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  // 4. Economic indicators (6 calls)
  try {
    const { refreshEconomicIndicators } = await import("@/lib/actions/economic")
    await refreshEconomicIndicators()
    results.economic = "ok"
  } catch (e: unknown) {
    results.economic = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  // 5. Market news (1 call)
  try {
    const { refreshMarketNews } = await import("@/lib/actions/market-news")
    await refreshMarketNews()
    results.news = "ok"
  } catch (e: unknown) {
    results.news = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  const allOk = Object.values(results).every((v) => v === "ok")

  return NextResponse.json(
    { success: allOk, results, refreshedAt: new Date().toISOString() },
    { status: allOk ? 200 : 207 },
  )
}

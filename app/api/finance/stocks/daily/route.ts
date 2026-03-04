import { NextRequest, NextResponse } from 'next/server'
import { getAlphaVantageDaily } from '@/lib/actions/alphavantage'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol') || 'MSFT'
    const outputSizeParam = request.nextUrl.searchParams.get('outputSize') || 'compact'
    const outputSize = outputSizeParam === 'full' ? 'full' : 'compact'

    const data = await getAlphaVantageDaily(symbol, outputSize)

    return NextResponse.json(
      {
        source: 'alpha-vantage (RapidAPI)',
        endpoint: 'TIME_SERIES_DAILY',
        outputSize,
        data,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'

    return NextResponse.json(
      {
        error: 'Failed to fetch stock daily series',
        details: message,
      },
      { status: 500 }
    )
  }
}

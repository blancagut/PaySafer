import { NextRequest, NextResponse } from 'next/server'
import { getFxRates } from '@/lib/actions/fx'

export async function GET(request: NextRequest) {
  try {
    const base = request.nextUrl.searchParams.get('base') || 'USD'
    const symbolsParam = request.nextUrl.searchParams.get('symbols') || 'EUR,GBP,AED'
    const symbols = symbolsParam
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)

    const data = await getFxRates({
      baseCurrency: base,
      symbols,
    })

    return NextResponse.json(
      {
        source: 'rate-api.com',
        endpoint: 'rates',
        data,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'

    return NextResponse.json(
      {
        error: 'Failed to fetch FX rates',
        details: message,
      },
      { status: 500 }
    )
  }
}

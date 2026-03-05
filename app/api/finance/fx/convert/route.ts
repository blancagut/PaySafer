import { NextRequest, NextResponse } from 'next/server'
import { convertCurrency } from '@/lib/actions/fx'

export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get('from') || 'USD'
    const to = request.nextUrl.searchParams.get('to') || 'EUR'
    const amountParam = request.nextUrl.searchParams.get('amount') || '1'
    const amount = Number.parseFloat(amountParam)

    const data = await convertCurrency({
      fromCurrency: from,
      toCurrency: to,
      amount,
    })

    return NextResponse.json(
      {
        source: 'rate-api.com',
        endpoint: 'convert',
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
        error: 'Failed to convert currency',
        details: message,
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getYFinanceNewsList } from '@/lib/actions/yfinance'

export async function GET(request: NextRequest) {
  try {
    const snippetCountParam = request.nextUrl.searchParams.get('snippetCount')
    const regionParam = request.nextUrl.searchParams.get('region')

    const snippetCount = snippetCountParam ? parseInt(snippetCountParam, 10) : 20
    const region = regionParam || 'US'

    const data = await getYFinanceNewsList({ snippetCount, region })

    return NextResponse.json(
      {
        source: 'yahoo-finance166 (RapidAPI)',
        endpoint: 'newsList',
        snippetCount,
        region,
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
        error: 'Failed to fetch finance news',
        details: message,
      },
      { status: 500 }
    )
  }
}

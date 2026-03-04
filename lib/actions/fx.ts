const FX_BASE_URL = 'https://currency-exchange-fx.p.rapidapi.com'

type ConvertCurrencyInput = {
  fromCurrency: string
  toCurrency: string
  amount: number
}

type GetFxRatesInput = {
  baseCurrency: string
  symbols: string[]
}

function getRapidApiKey(): string {
  const value = process.env.RAPIDAPI_KEY

  if (!value) {
    throw new Error('Missing required environment variable: RAPIDAPI_KEY')
  }

  return value
}

function getFxHost(): string {
  return process.env.RAPIDAPI_FX_HOST || 'currency-exchange-fx.p.rapidapi.com'
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase()
}

export async function convertCurrency({
  fromCurrency,
  toCurrency,
  amount,
}: ConvertCurrencyInput): Promise<{
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  rate: number
}> {
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)

  if (!from || !to) {
    throw new Error('fromCurrency and toCurrency are required')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number')
  }

  if (from === to) {
    return {
      fromCurrency: from,
      toCurrency: to,
      amount,
      convertedAmount: amount,
      rate: 1,
    }
  }

  const url = new URL('/convert', FX_BASE_URL)
  url.searchParams.set('from_currency', from)
  url.searchParams.set('to_currency', to)
  url.searchParams.set('from_value', amount.toFixed(2))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': getRapidApiKey(),
      'x-rapidapi-host': getFxHost(),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => 'No additional details')
    throw new Error(`FX convert request failed (${response.status}): ${details}`)
  }

  const rawText = await response.text()
  const convertedAmount = Number.parseFloat(rawText)

  if (!Number.isFinite(convertedAmount)) {
    throw new Error(`Unexpected FX convert response: ${rawText}`)
  }

  return {
    fromCurrency: from,
    toCurrency: to,
    amount,
    convertedAmount,
    rate: convertedAmount / amount,
  }
}

export async function getFxRates({
  baseCurrency,
  symbols,
}: GetFxRatesInput): Promise<{
  baseCurrency: string
  rates: Record<string, number>
}> {
  const base = normalizeCurrency(baseCurrency)
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizeCurrency).filter(Boolean))
  ).filter((symbol) => symbol !== base)

  if (!base) {
    throw new Error('baseCurrency is required')
  }

  if (normalizedSymbols.length === 0) {
    return { baseCurrency: base, rates: {} }
  }

  const results = await Promise.all(
    normalizedSymbols.map(async (symbol) => {
      const conversion = await convertCurrency({
        fromCurrency: base,
        toCurrency: symbol,
        amount: 1,
      })

      return [symbol, conversion.convertedAmount] as const
    })
  )

  return {
    baseCurrency: base,
    rates: Object.fromEntries(results),
  }
}

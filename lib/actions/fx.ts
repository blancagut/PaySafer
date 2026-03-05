// ─── rate-api.com FX provider with Alpha Vantage fallback ───

const RATE_API_BASE = 'https://rate-api.com/api/v1'

type ConvertCurrencyInput = {
  fromCurrency: string
  toCurrency: string
  amount: number
}

type GetFxRatesInput = {
  baseCurrency: string
  symbols: string[]
}

type ConvertResult = {
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  rate: number
}

function getRateApiKey(): string {
  const value = process.env.RATE_API_KEY
  if (!value) {
    throw new Error('Missing required environment variable: RATE_API_KEY')
  }
  return value
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase()
}

// ─── Alpha Vantage fallback ───

async function convertWithAlphaVantage(
  from: string,
  to: string,
  amount: number
): Promise<ConvertResult> {
  const { getForexRate } = await import('@/lib/alphavantage/client')
  const quote = await getForexRate(from, to)

  if (!Number.isFinite(quote.exchangeRate) || quote.exchangeRate <= 0) {
    throw new Error(`Invalid Alpha Vantage rate for ${from}/${to}`)
  }

  const convertedAmount = Number.parseFloat((amount * quote.exchangeRate).toFixed(6))
  return {
    fromCurrency: from,
    toCurrency: to,
    amount,
    convertedAmount,
    rate: quote.exchangeRate,
  }
}

// ─── Convert (primary: rate-api.com, fallback: Alpha Vantage) ───

export async function convertCurrency({
  fromCurrency,
  toCurrency,
  amount,
}: ConvertCurrencyInput): Promise<ConvertResult> {
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)

  if (!from || !to) {
    throw new Error('fromCurrency and toCurrency are required')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number')
  }

  if (from === to) {
    return { fromCurrency: from, toCurrency: to, amount, convertedAmount: amount, rate: 1 }
  }

  try {
    const key = getRateApiKey()
    const url = `${RATE_API_BASE}/${key}/convert?from=${from}&to=${to}&amount=${amount}`

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      console.warn(`rate-api.com convert returned ${response.status}, falling back to Alpha Vantage`)
      return convertWithAlphaVantage(from, to, amount)
    }

    const json = await response.json()

    // rate-api.com returns { from, to, amount, result, rate, ... }
    const result = Number.parseFloat(json.result)
    const rate = Number.parseFloat(json.rate)

    if (!Number.isFinite(result) || !Number.isFinite(rate) || rate <= 0) {
      console.warn('rate-api.com returned invalid data, falling back to Alpha Vantage', json)
      return convertWithAlphaVantage(from, to, amount)
    }

    return {
      fromCurrency: from,
      toCurrency: to,
      amount,
      convertedAmount: Number.parseFloat(result.toFixed(6)),
      rate,
    }
  } catch (err) {
    console.warn('rate-api.com convert failed, falling back to Alpha Vantage:', err)
    return convertWithAlphaVantage(from, to, amount)
  }
}

// ─── Rates (primary: rate-api.com /latest, fallback: per-pair convert) ───

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

  // Try bulk fetch from /latest first
  try {
    const key = getRateApiKey()
    const url = `${RATE_API_BASE}/${key}/latest?base=${base}`
    const response = await fetch(url, { cache: 'no-store' })

    if (response.ok) {
      const json = await response.json()
      // rate-api.com returns { base, rates: { EUR: 0.85, GBP: 0.73, ... } }
      if (json.rates && typeof json.rates === 'object') {
        const rates: Record<string, number> = {}
        for (const sym of normalizedSymbols) {
          const val = Number.parseFloat(json.rates[sym])
          if (Number.isFinite(val) && val > 0) {
            rates[sym] = val
          }
        }
        // If we got at least some rates, return them
        if (Object.keys(rates).length > 0) {
          return { baseCurrency: base, rates }
        }
      }
    }
  } catch (err) {
    console.warn('rate-api.com /latest failed, falling back to per-pair:', err)
  }

  // Fallback: convert each symbol individually (uses rate-api → Alpha Vantage cascade)
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

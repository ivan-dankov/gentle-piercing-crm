export interface PlnExchangeRates {
  usd: number
  eur: number
}

const FALLBACK_RATES: PlnExchangeRates = {
  usd: 4.0,
  eur: 4.3,
}

interface NbpRate {
  code: string
  mid: number
}

interface NbpTableResponse {
  rates: NbpRate[]
}

/**
 * Fetch current PLN exchange rates from the National Bank of Poland (NBP).
 * Rates are PLN per 1 unit of foreign currency. Cached for 1 hour.
 */
export async function getPlnExchangeRates(): Promise<PlnExchangeRates> {
  try {
    const response = await fetch('https://api.nbp.pl/api/exchangerates/tables/a/?format=json', {
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`NBP API responded with ${response.status}`)
    }

    const data = (await response.json()) as NbpTableResponse[]
    const rates = data[0]?.rates

    if (!rates?.length) {
      throw new Error('NBP API returned no rates')
    }

    const usdRate = rates.find((rate) => rate.code === 'USD')?.mid
    const eurRate = rates.find((rate) => rate.code === 'EUR')?.mid

    if (!usdRate || !eurRate) {
      throw new Error('NBP API missing USD or EUR rate')
    }

    return { usd: usdRate, eur: eurRate }
  } catch (error) {
    console.error('Failed to fetch NBP exchange rates, using fallback:', error)
    return FALLBACK_RATES
  }
}

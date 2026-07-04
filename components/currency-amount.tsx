import { formatEur, formatPln, formatUsd, convertFromPln } from '@/lib/currency/format-currency'
import type { PlnExchangeRates } from '@/lib/currency/exchange-rates'

interface CurrencyAmountProps {
  amountPln: number
  rates: PlnExchangeRates
  size?: 'lg' | 'sm'
}

export function CurrencyAmount({ amountPln, rates, size = 'lg' }: CurrencyAmountProps) {
  const usdAmount = convertFromPln(amountPln, rates.usd)
  const eurAmount = convertFromPln(amountPln, rates.eur)

  return (
    <div>
      <div
        className={
          size === 'sm'
            ? 'text-sm font-bold tracking-tight'
            : 'text-2xl font-bold tracking-tight'
        }
      >
        {formatPln(amountPln)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {formatUsd(usdAmount)} · {formatEur(eurAmount)}
      </div>
    </div>
  )
}

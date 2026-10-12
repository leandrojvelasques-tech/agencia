import { getPaymentDiscount } from '../lib/paymentDiscount'

const money = amount => '$' + amount.toLocaleString('es-AR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})

export default function PaymentDiscountSummary({ discount, totalAmount }) {
  const result = getPaymentDiscount(discount, totalAmount)
  if (!result) return null

  return (
    <section aria-label="Alternativa de pago con descuento" className="mt-4 rounded-xl border border-[var(--color-deep-green)]/20 bg-[var(--color-deep-green)]/5 p-4 space-y-3 text-sm">
      <h3 className="font-bold text-[var(--color-deep-green)]">Alternativa: {result.label.toLocaleLowerCase('es-AR')}</h3>
      <div className="flex flex-wrap justify-between gap-2 text-[var(--color-dark-gray)]">
        <span>Descuento ({result.percentage.toLocaleString('es-AR')}%)</span>
        <span className="font-mono font-bold break-all">−{money(result.amount)}</span>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--color-deep-green)]/20 pt-3 font-bold text-[var(--color-deep-green)]">
        <span>Total con descuento</span>
        <span className="font-mono text-lg break-all">{money(result.total)}</span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-dark-gray)]/70">El descuento se aplica sobre el total del presupuesto al elegir esta modalidad, como alternativa al plan de pagos indicado.</p>
    </section>
  )
}

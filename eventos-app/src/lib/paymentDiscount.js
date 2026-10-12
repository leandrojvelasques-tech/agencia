export const PAYMENT_DISCOUNT_TYPES = {
  cash: 'Pago en efectivo',
  upfront: 'Pago al contado',
  single_payment: 'Pago único',
}

export function getPaymentDiscount(discount, totalAmount) {
  if (!discount?.enabled) return null
  const percentage = Number(discount.percentage)
  const total = Number(totalAmount)
  if (!Object.hasOwn(PAYMENT_DISCOUNT_TYPES, discount.type) ||
      !Number.isFinite(percentage) || percentage <= 0 || percentage > 100 ||
      !Number.isFinite(total) || total < 0) return null

  const amount = Math.round((total * percentage / 100 + Number.EPSILON) * 100) / 100
  return {
    label: PAYMENT_DISCOUNT_TYPES[discount.type],
    percentage,
    amount,
    total: Math.round((total - amount + Number.EPSILON) * 100) / 100,
  }
}

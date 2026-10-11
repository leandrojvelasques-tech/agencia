export function getPaymentAmount(item, totalAmount) {
  if (item.amount != null && item.amount !== '') return Number(item.amount)

  // Keep amounts from proposals saved before payments were entered directly.
  return Math.round(Number(totalAmount || 0) * Number(item.percentage || 0)) / 100
}

export function normalizePaymentSchedule(schedule, totalAmount) {
  return schedule.map(item => {
    const { percentage: _percentage, ...payment } = item
    return { ...payment, amount: getPaymentAmount(item, totalAmount) }
  })
}

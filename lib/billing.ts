/** GST is added to merchandise prices. Delivery charges are shown separately. */
export const GST_RATE = 18 as const
export interface OrderGst {
  rate: typeof GST_RATE
  pricing: "exclusive"
  taxableAmount: number
  amount: number
}

const paise = (amount: number) => Math.round(amount * 100)

export function calculateBilling(subtotal: number, shipping: number) {
  const subtotalPaise = paise(subtotal)
  const shippingPaise = paise(shipping)
  const taxPaise = Math.round(subtotalPaise * GST_RATE / 100)
  const gst: OrderGst = { rate: GST_RATE, pricing: "exclusive", taxableAmount: subtotalPaise / 100, amount: taxPaise / 100 }
  return { subtotal: subtotalPaise / 100, shipping: shippingPaise / 100, gst, total: (subtotalPaise + shippingPaise + taxPaise) / 100 }
}

/** Never recalculate tax or the amount due on an order placed before GST snapshots. */
export function recordedGst(order: { gst?: OrderGst }) {
  const gst = order.gst
  return gst?.pricing === "exclusive" && gst.rate === GST_RATE && Number.isFinite(gst.amount) && gst.amount >= 0 && Number.isFinite(gst.taxableAmount) && gst.taxableAmount >= 0 ? gst : null
}

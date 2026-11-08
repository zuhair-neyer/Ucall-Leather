import { PAYMENT_STATUS_LABELS, type PaymentStatus, type StoreOrder } from "./order-status"

/** Read compatibility only. Never infer payment capture or stock allocation. */
export function normalizeOrder(data: Record<string, unknown>, id?: string): StoreOrder {
  const method = typeof data.paymentMethod === "string" ? data.paymentMethod.trim().toLowerCase() : ""
  const legacyPayment = data.payment && typeof data.payment === "object" ? data.payment as Record<string, unknown> : null
  const hasLegacyRazorpayId = typeof legacyPayment?.razorpay_payment_id === "string" || typeof legacyPayment?.razorpay_order_id === "string"
  const paymentMethod = method === "cash on delivery" || method === "cod" ? "cod"
    : method === "razorpay" || (!method && hasLegacyRazorpayId) ? "razorpay"
    : data.paymentMethod
  const paymentStatus = typeof data.paymentStatus === "string" && Object.hasOwn(PAYMENT_STATUS_LABELS, data.paymentStatus)
    ? data.paymentStatus as PaymentStatus : paymentMethod === "cod" ? "cod_pending" : "awaiting_payment"
  return {
    ...data, ...(id === undefined ? {} : { id }), paymentMethod, paymentStatus,
    status: data.status === "processing" ? "confirmed" : data.status,
  } as StoreOrder
}

export function paymentMethodLabel(method: unknown) {
  return method === "cod" ? "Cash on Delivery" : method === "razorpay" ? "Razorpay" : "Payment method unavailable"
}

export function paymentStatusLabel(order: Pick<StoreOrder, "paymentMethod" | "paymentStatus" | "status">) {
  if (order.paymentMethod === "cod" && order.paymentStatus === "cod_pending") {
    if (order.status === "cancelled") return "No payment due"
    if (order.status === "delivered") return "Cash collection not recorded"
  }
  return PAYMENT_STATUS_LABELS[order.paymentStatus] || "Payment status unavailable"
}

export function countsAsRevenue(order: Pick<StoreOrder, "paymentStatus" | "status">) {
  return order.status !== "cancelled" && order.paymentStatus === "paid"
}

/** Existing shipments can be completed without inventing an allocation record. */
export function canCompleteLegacyCodShipment(order: StoreOrder) {
  return order.paymentMethod === "cod" && order.stockDeducted === undefined && ["shipped", "delivered"].includes(order.status)
}

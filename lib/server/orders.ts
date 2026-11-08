import "server-only"
import { createHash } from "node:crypto"
import { Timestamp, type Transaction } from "firebase-admin/firestore"
import type { DecodedIdToken } from "firebase-admin/auth"
import { z } from "zod"
import { getAdminDb } from "../firebase-admin"
import { shippingFor } from "../config"
import { calculateBilling } from "../billing"
import type { StoreOrder, OrderItem, OrderStatus } from "../order-status"
import { canCompleteLegacyCodShipment, normalizeOrder } from "../order-normalization"
import { checkoutSchema } from "../validation"
import { HttpError } from "./http"
import { queueOrderEmail, queuePaymentEmail, queueStatusEmail, type EmailOrderSnapshot } from "./email-events"

export type OrderRecord = Omit<StoreOrder, "id" | "createdAt" | "updatedAt"> & {
  createdAt: Timestamp; updatedAt: Timestamp; requestHash: string; productIds: string[];
  stockDeducted: boolean; cancellationReason?: string
}
export type CheckoutInput = z.infer<typeof checkoutSchema>
export const toPaise = (rupees: number) => Math.round(rupees * 100)
export function queueConfirmation(tx: Transaction, orderId: string, order: EmailOrderSnapshot, occurredAt: Timestamp) {
  queueOrderEmail(tx, `${orderId}_confirmation`, orderId, order, "confirmation", occurredAt)
}
export async function createCheckoutOrder(user: Pick<DecodedIdToken, "uid" | "email">, input: CheckoutInput, key: string) {
  if (!user.email) throw new HttpError(400, "An email address is required on your account")
  const db = getAdminDb()
  const id = createHash("sha256").update(`${user.uid}:${key}`).digest("hex").slice(0, 32)
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex")
  const ref = db.collection("orders").doc(id)
  const result = await db.runTransaction(async tx => {
    const existing = await tx.get(ref)
    if (existing.exists) {
      const order = existing.data() as OrderRecord
      if (order.requestHash !== requestHash) throw new HttpError(409, "This checkout was already used. Start a new checkout")
      return { order, created: false }
    }
    const productRefs = input.items.map(item => db.collection("products").doc(item.id))
    const products = await tx.getAll(...productRefs)
    const items: OrderItem[] = products.map((snap, index) => {
      if (!snap.exists) throw new HttpError(409, "A product is no longer available. Refresh your cart")
      // Validate the fields used for money/stock independently of legacy metadata.
      const data = snap.data()!
      const price = z.number().positive().max(1000000).safeParse(data.price)
      const stock = z.number().int().min(0).safeParse(data.stock)
      if (!price.success || !stock.success || typeof data.name !== "string" || typeof data.image !== "string") throw new HttpError(409, "A product needs a catalog update. Please contact the store")
      const quantity = input.items[index].quantity
      if (stock.data < quantity) throw new HttpError(409, `${data.name} has insufficient stock. Update your cart`)
      return { id: snap.id, name: data.name, image: data.image, price: toPaise(price.data) / 100, quantity }
    })
    const subtotal = items.reduce((sum, item) => sum + toPaise(item.price) * item.quantity, 0) / 100
    const shipping = shippingFor(subtotal), now = Timestamp.now()
    const order: OrderRecord = {
      userId: user.uid, userEmail: user.email!, userName: input.address.name,
      items, ...calculateBilling(subtotal, shipping),
      shippingAddress: input.address, paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "cod" ? "cod_pending" : "awaiting_payment",
      status: "pending", stockDeducted: input.paymentMethod === "cod",
      requestHash, productIds: items.map(i => i.id), createdAt: now, updatedAt: now,
    }
    if (input.paymentMethod === "cod") {
      products.forEach((snap, index) => tx.update(snap.ref, { stock: snap.data()!.stock - items[index].quantity, updatedAt: now }))
      queueConfirmation(tx, id, order, now)
    }
    tx.create(ref, order)
    return { order, created: true }
  })
  return { id, ...result }
}
export interface CapturedPayment { id: string; orderId: string; amount: number; currency: string }
export async function fulfillCapturedPayment(orderId: string, payment: CapturedPayment) {
  const db = getAdminDb(), ref = db.collection("orders").doc(orderId)
  const receiptRef = db.collection("paymentReceipts").doc(payment.id)
  return db.runTransaction(async tx => {
    const [snap, receipt] = await tx.getAll(ref, receiptRef)
    if (!snap.exists) throw new HttpError(404, "Order not found")
    const order = snap.data() as OrderRecord
    if (receipt.exists) return { orderId, paymentStatus: order.paymentStatus }
    if (order.paymentMethod !== "razorpay" || payment.currency !== "INR" || payment.amount !== toPaise(order.total)) throw new HttpError(400, "Payment amount does not match the order")
    if (order.razorpay?.orderId && order.razorpay.orderId !== payment.orderId) throw new HttpError(400, "Payment belongs to another order")
    const now = Timestamp.now()
    // A second captured payment is kept separately for refund, never fulfilled twice.
    if (order.razorpay?.paymentId && order.razorpay.paymentId !== payment.id) {
      tx.create(receiptRef, { storeOrderId: orderId, ...payment, refundNeeded: true, createdAt: now })
      tx.set(db.collection("refunds").doc(payment.id), { orderId, paymentId: payment.id, amount: payment.amount, reason: "duplicate_payment", status: "refund_needed", createdAt: now })
      return { orderId, paymentStatus: order.paymentStatus }
    }
    const products = order.items.length ? await tx.getAll(...order.items.map(item => db.collection("products").doc(item.id))) : []
    const shortage = !order.stockDeducted && products.some((p, i) => !p.exists || !Number.isInteger(p.data()?.stock) || p.data()!.stock < order.items[i].quantity)
    const needsRefund = order.status === "cancelled" || shortage
    if (!needsRefund && !order.stockDeducted) products.forEach((p, i) => tx.update(p.ref, { stock: p.data()!.stock - order.items[i].quantity, updatedAt: now }))
    const paymentStatus = needsRefund ? "refund_needed" : "paid"
    const status = needsRefund ? "cancelled" : order.status === "pending" ? "confirmed" : order.status
    tx.update(ref, {
      paymentStatus, status,
      stockDeducted: needsRefund ? order.stockDeducted : true,
      razorpay: { orderId: payment.orderId, paymentId: payment.id }, updatedAt: now,
      ...(shortage ? { cancellationReason: "Stock sold out before payment was captured" } : {}),
    })
    tx.create(receiptRef, { storeOrderId: orderId, ...payment, refundNeeded: needsRefund, createdAt: now })
    if (needsRefund) tx.set(db.collection("refunds").doc(payment.id), { orderId, paymentId: payment.id, amount: payment.amount, reason: shortage ? "out_of_stock" : "cancelled", status: "refund_needed", createdAt: now })
    const emailOrder: EmailOrderSnapshot = { ...order, status, paymentStatus }
    if (status !== order.status) queueStatusEmail(tx, orderId, emailOrder, now, "confirmation")
    else if (paymentStatus !== order.paymentStatus) queuePaymentEmail(tx, orderId, emailOrder, now)
    return { orderId, paymentStatus }
  })
}
export async function markPaymentFailed(orderId: string, razorpayOrderId: string) {
  const db = getAdminDb(), ref = db.collection("orders").doc(orderId)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpError(404, "Order not found")
    const order = snap.data() as OrderRecord
    if (order.paymentMethod !== "razorpay" || order.razorpay?.orderId !== razorpayOrderId) throw new HttpError(400, "Payment does not match the order")
    if (order.paymentStatus === "awaiting_payment") tx.update(ref, { paymentStatus: "failed", updatedAt: Timestamp.now() })
  })
}
// A signed capture webhook can be delayed until after a dashboard refund. Check
// current provider state and never ship a payment already fully refunded.
export async function recordRefundedPayment(orderId: string, payment: CapturedPayment) {
  const db = getAdminDb(), ref = db.collection("orders").doc(orderId)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpError(404, "Order not found")
    const order = snap.data() as OrderRecord
    if (order.paymentMethod !== "razorpay" || payment.currency !== "INR" || payment.amount !== toPaise(order.total) || (order.razorpay?.orderId && order.razorpay.orderId !== payment.orderId)) throw new HttpError(400, "Refund does not match this order")
    const differentPayment = Boolean(order.razorpay?.paymentId && order.razorpay.paymentId !== payment.id)
    const unshipped = ["pending", "confirmed", "cancelled"].includes(order.status)
    const products = !differentPayment && order.stockDeducted && unshipped ? await tx.getAll(...order.items.map(item => db.collection("products").doc(item.id))) : []
    const now = Timestamp.now()
    products.forEach((product, i) => {
      if (!product.exists) throw new HttpError(409, "Restore the product before refund reconciliation")
      tx.update(product.ref, { stock: product.data()!.stock + order.items[i].quantity, updatedAt: now })
    })
    if (!differentPayment) {
      const status = unshipped ? "cancelled" : order.status
      tx.update(ref, { paymentStatus: "refunded", razorpay: { orderId: payment.orderId, paymentId: payment.id }, status, stockDeducted: unshipped ? false : order.stockDeducted, updatedAt: now })
      const emailOrder = { ...order, status, paymentStatus: "refunded" as const }
      if (status !== order.status) queueStatusEmail(tx, orderId, emailOrder, now)
      else if (order.paymentStatus !== "refunded") queuePaymentEmail(tx, orderId, emailOrder, now)
    }
    tx.set(db.collection("paymentReceipts").doc(payment.id), { storeOrderId: orderId, ...payment, refundNeeded: false, createdAt: now })
    tx.set(db.collection("refunds").doc(payment.id), { orderId, paymentId: payment.id, amount: payment.amount, status: "refunded", reason: "provider_refund", updatedAt: now })
  })
}
export async function cancelOrder(orderId: string, uid: string, admin: boolean) {
  const db = getAdminDb(), ref = db.collection("orders").doc(orderId)
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpError(404, "Order not found")
    const order = normalizeOrder(snap.data()!, orderId)
    if (order.userId !== uid && !admin) throw new HttpError(403, "You cannot access this order")
    if (order.status === "cancelled") return { orderId, status: "cancelled", paymentStatus: order.paymentStatus }
    if (admin ? !["pending", "confirmed"].includes(order.status) : order.status !== "pending") throw new HttpError(409, "This order cannot be cancelled online. Contact the store")
    // Missing allocation history is not evidence that legacy stock was deducted.
    const products = order.stockDeducted === true ? await tx.getAll(...order.items.map(item => db.collection("products").doc(item.id))) : []
    const now = Timestamp.now()
    products.forEach((p, i) => {
      if (!p.exists) throw new HttpError(409, "A product was removed. Ask the owner to restore the product before cancelling")
      tx.update(p.ref, { stock: p.data()!.stock + order.items[i].quantity, updatedAt: now })
    })
    const paymentStatus = order.paymentStatus === "paid" ? "refund_needed" : order.paymentMethod === "razorpay" && ["awaiting_payment", "failed"].includes(order.paymentStatus) ? "failed" : order.paymentStatus
    tx.update(ref, { status: "cancelled", paymentStatus, ...(["cod", "razorpay"].includes(order.paymentMethod) ? { paymentMethod: order.paymentMethod } : {}), stockDeducted: false, updatedAt: now })
    queueStatusEmail(tx, orderId, { ...order, status: "cancelled", paymentStatus }, now)
    if (paymentStatus === "refund_needed" && order.razorpay?.paymentId) tx.set(db.collection("refunds").doc(order.razorpay.paymentId), { orderId, paymentId: order.razorpay.paymentId, amount: toPaise(order.total), reason: "cancelled", status: "refund_needed", createdAt: now })
    return { orderId, status: "cancelled", paymentStatus }
  })
}
export async function updateOrderStatus(orderId: string, status: OrderStatus, tracking?: { carrier: string; number: string; url: string }) {
  if (status === "cancelled") throw new HttpError(400, "Use cancellation so stock is returned safely")
  const db = getAdminDb(), ref = db.collection("orders").doc(orderId)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpError(404, "Order not found")
    const order = normalizeOrder(snap.data()!, orderId)
    const next: Record<OrderStatus, OrderStatus[]> = { pending: ["pending", "confirmed"], confirmed: ["confirmed", "shipped"], shipped: ["shipped", "delivered"], delivered: ["delivered"], cancelled: [] }
    if (!next[order.status]?.includes(status)) throw new HttpError(409, "Order status must move forward one step at a time")
    if (!["cod", "razorpay"].includes(order.paymentMethod)) throw new HttpError(409, "The payment method needs review before this order can be fulfilled")
    if (order.paymentMethod === "razorpay" && order.paymentStatus !== "paid") throw new HttpError(409, "Wait for a captured payment before fulfilling this order")
    if (order.stockDeducted !== true && !canCompleteLegacyCodShipment(order)) throw new HttpError(409, "Stock has not been allocated to this order")
    // Moving a COD shipment to delivered records collection. Editing tracking on
    // an already delivered legacy order must not invent a payment record.
    const paymentStatus = order.paymentMethod === "cod" && status === "delivered" && order.status !== "delivered" ? "paid" : order.paymentStatus
    const now = Timestamp.now()
    tx.update(ref, { status, paymentMethod: order.paymentMethod, paymentStatus, ...(tracking ? { tracking } : {}), updatedAt: now })
    if (status !== order.status) queueStatusEmail(tx, orderId, { ...order, status, paymentStatus, ...(tracking ? { tracking } : {}) }, now)
    if (status === "delivered") order.items.forEach(item => tx.set(db.collection("verifiedPurchases").doc(`${item.id}_${order.userId}`), { userId: order.userId, productId: item.id, orderId }))
  })
}

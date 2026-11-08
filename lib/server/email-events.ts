import "server-only"
import { Timestamp, type Transaction } from "firebase-admin/firestore"
import { getAdminDb } from "../firebase-admin"
import { normalizeOrder } from "../order-normalization"
import type { StoreOrder } from "../order-status"

export type EmailOrderSnapshot = Pick<StoreOrder, "userEmail" | "userName" | "status" | "paymentMethod" | "paymentStatus" | "items" | "subtotal" | "shipping" | "total" | "gst" | "tracking">
export type OrderEmailKind = "confirmation" | "status" | "payment"
export function snapshotForEmail(source: EmailOrderSnapshot): EmailOrderSnapshot {
  const order = normalizeOrder({ ...source })
  return {
    userEmail: order.userEmail || order.shippingAddress?.email || "", userName: order.userName || order.shippingAddress?.name || "Customer",
    status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    items: order.items || [], subtotal: order.subtotal || 0, shipping: order.shipping || 0, total: order.total || 0,
    ...(order.gst ? { gst: order.gst } : {}), ...(order.tracking ? { tracking: order.tracking } : {}),
  }
}
export function queueOrderEmail(tx: Transaction, eventId: string, orderId: string, order: EmailOrderSnapshot, kind: OrderEmailKind, occurredAt: Timestamp) {
  // Call only for a newly committed transition. create() cannot reset sent/lease markers.
  tx.create(getAdminDb().collection("emailOutbox").doc(eventId), {
    orderId, kind, orderStatus: order.status, snapshot: snapshotForEmail(order), occurredAt,
    status: "pending", createdAt: occurredAt, attempts: 0,
  })
}
export function queueStatusEmail(tx: Transaction, orderId: string, order: EmailOrderSnapshot, occurredAt: Timestamp, kind: OrderEmailKind = "status") {
  queueOrderEmail(tx, `${orderId}_status_${order.status}`, orderId, order, kind, occurredAt)
}
export function queuePaymentEmail(tx: Transaction, orderId: string, order: EmailOrderSnapshot, occurredAt: Timestamp) {
  queueOrderEmail(tx, `${orderId}_payment_${order.paymentStatus}`, orderId, order, "payment", occurredAt)
}

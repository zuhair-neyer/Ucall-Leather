import "server-only"
import { randomUUID } from "node:crypto"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "../firebase-admin"
import { CONTACT, SITE_URL, STORE_NAME } from "../config"
import { paymentStatusLabel } from "../order-normalization"
import { formatINR } from "../format"
import { recordedGst } from "../billing"
import { ORDER_STATUS_LABELS } from "../order-status"
import { snapshotForEmail, type EmailOrderSnapshot, type OrderEmailKind } from "./email-events"
import { sendTransactionalEmail } from "./email-transport"

export interface OrderEmailEvent {
  orderId: string; kind?: OrderEmailKind; status: "pending" | "sent"; snapshot?: EmailOrderSnapshot;
  occurredAt?: Timestamp; createdAt?: Timestamp; legacySnapshot?: boolean; attempts?: number;
  customerSent?: boolean; ownerSent?: boolean; leaseUntil?: Timestamp; leaseToken?: string;
}
export type EmailSender = (message: { to: string; subject: string; text: string; idempotencyKey: string }) => Promise<void>
function eventTime(event: OrderEmailEvent) {
  const date = (event.occurredAt || event.createdAt)?.toDate() || new Date()
  return date.toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"
}
export function renderOrderEmail(event: OrderEmailEvent & { snapshot: EmailOrderSnapshot }) {
  const order = event.snapshot, gst = recordedGst(order)
  const statusPhrases = { pending: "has been received", confirmed: "is confirmed", shipped: "has shipped", delivered: "was delivered", cancelled: "was cancelled" }
  const phrase = event.legacySnapshot ? "update" : event.kind === "payment"
    ? order.paymentStatus === "refunded" ? "refund update" : order.paymentStatus === "refund_needed" ? "needs a refund review" : "payment update"
    : statusPhrases[order.status] || "update"
  const trackingUrl = order.tracking?.url && /^https:\/\/[^\s]+$/.test(order.tracking.url) ? order.tracking.url : ""
  const text = [
    `Hello ${order.userName},`, `Your UCALL order ${phrase}.`, `Order number: ${event.orderId}`,
    `${event.legacySnapshot ? "Current status checked" : "Update recorded"}: ${eventTime(event)}.`,
    `Order status at this update: ${ORDER_STATUS_LABELS[order.status] || "Needs review"}.`,
    `Payment at this update: ${paymentStatusLabel(order)}.`,
    ...(order.status === "shipped" && order.tracking?.number ? [`Tracking: ${order.tracking.carrier || "Courier"} — ${order.tracking.number}`, ...(trackingUrl ? [`Track your parcel: ${trackingUrl}`] : [])] : []),
    ...(order.status === "cancelled" ? [order.paymentStatus === "refund_needed" ? "Your order is cancelled and a refund is required. This message does not confirm a completed refund. Our team will contact you about the refund." : order.paymentStatus === "refunded" ? "Your order is cancelled and the payment has a recorded refunded status." : order.paymentMethod === "cod" ? "No cash-on-delivery payment is due for this cancelled order." : "Check the recorded payment status above. If you were charged and need help, contact our support team."] : []),
    ...(event.kind === "payment" && order.paymentStatus === "refunded" ? ["The payment provider has confirmed a full refund for this order’s recorded payment."] : []),
    ...order.items.map(item => `${item.name} × ${item.quantity}: ${formatINR(item.price * item.quantity)}`),
    `Merchandise subtotal: ${formatINR(order.subtotal)}`,
    ...(gst ? [`GST (${gst.rate}%): ${formatINR(gst.amount)}`] : ["GST was not recorded on this older order. The original total is unchanged."]),
    `Shipping: ${formatINR(order.shipping)}`, `Order total: ${formatINR(order.total)}`,
    `View the latest order details: ${SITE_URL}/orders/${event.orderId}`,
    `Get support: ${SITE_URL}/orders/${event.orderId}/support`,
    "This email records the update at the time shown above. Your order page always shows the latest status.",
    `${STORE_NAME}\n${CONTACT.email} / ${CONTACT.phone}`,
  ].join("\n\n")
  return { subject: `Your UCALL order ${phrase} — #${event.orderId.slice(0, 8)}`, text }
}

// Events are committed with their order changes. A lease serializes workers;
// per-recipient progress and stable provider keys make ordinary retries safe.
export async function sendOutboxEmail(eventId: string, send: EmailSender = sendTransactionalEmail): Promise<"sent" | "pending" | "missing"> {
  const db = getAdminDb(), ref = db.collection("emailOutbox").doc(eventId), leaseToken = randomUUID()
  try {
    const claimed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), data = snap.data() as OrderEmailEvent | undefined
      if (!data) return { outcome: "missing" as const }
      if (data.status === "sent") return { outcome: "sent" as const }
      if ((data.leaseUntil?.toMillis() || 0) > Date.now()) return { outcome: "pending" as const }
      let snapshot = data.snapshot
      if (!snapshot) {
        const order = await tx.get(db.collection("orders").doc(data.orderId))
        if (!order.exists) throw new Error("Order is unavailable")
        snapshot = snapshotForEmail(order.data() as EmailOrderSnapshot)
      }
      const event = { ...data, snapshot, ...(!data.snapshot ? { occurredAt: Timestamp.now(), legacySnapshot: true } : {}) }
      tx.update(ref, { snapshot, ...(event.legacySnapshot ? { occurredAt: event.occurredAt, legacySnapshot: true } : {}), leaseToken, leaseUntil: Timestamp.fromMillis(Date.now() + 120_000), attempts: (data.attempts || 0) + 1 })
      return { event }
    })
    if ("outcome" in claimed) return claimed.outcome || "pending"
    const event = claimed.event, content = renderOrderEmail(event)
    const recipients = [{ key: "customer" as const, email: event.snapshot.userEmail },
      ...(event.kind === "confirmation" || !event.kind ? [{ key: "owner" as const, email: CONTACT.email }] : []),
    ].filter((recipient, index, all) => all.findIndex(other => other.email.trim().toLowerCase() === recipient.email.trim().toLowerCase()) === index)
    for (const recipient of recipients) {
      if (event[`${recipient.key}Sent`]) continue
      await send({ to: recipient.email, ...content, idempotencyKey: `order-email-${eventId}-${recipient.key}` })
      const saved = await db.runTransaction(async tx => {
        const progress = await tx.get(ref)
        if (progress.data()?.leaseToken !== leaseToken) return false
        tx.update(ref, { [`${recipient.key}Sent`]: true })
        return true
      })
      if (!saved) return "pending"
    }
    return await db.runTransaction(async tx => {
      const progress = await tx.get(ref)
      if (progress.data()?.leaseToken !== leaseToken) return "pending" as const
      tx.update(ref, { status: "sent", sentAt: Timestamp.now(), leaseUntil: Timestamp.fromMillis(0), leaseToken: null, lastError: null })
      return "sent" as const
    })
  } catch {
    // A provider/configuration outage must never roll back an accepted order update.
    await db.runTransaction(async tx => {
      const progress = await tx.get(ref)
      if (!progress.exists || progress.data()?.status === "sent" || (progress.data()?.leaseToken && progress.data()?.leaseToken !== leaseToken)) return
      tx.update(ref, { status: "pending", leaseUntil: Timestamp.fromMillis(0), leaseToken: null, lastError: "Delivery unavailable; check email configuration and retry." })
    }).catch(() => undefined)
    return "pending"
  }
}

/** Compatibility entry point used by checkout, payment and status-change routes. */
export async function sendOrderEmail(orderId: string, send: EmailSender = sendTransactionalEmail) {
  const events = await getAdminDb().collection("emailOutbox").where("orderId", "==", orderId).get()
  const rank = (event: OrderEmailEvent) => event.kind === "payment" ? (event.snapshot?.paymentStatus === "refunded" ? 6 : 5) : ({ pending: 0, confirmed: 1, shipped: 2, delivered: 3, cancelled: 4 }[event.snapshot?.status || "pending"] || 0)
  const pending = events.docs.filter(doc => doc.data().status === "pending").sort((a, b) =>
    (a.data().occurredAt?.toMillis() || a.data().createdAt?.toMillis() || 0) - (b.data().occurredAt?.toMillis() || b.data().createdAt?.toMillis() || 0) || rank(a.data() as OrderEmailEvent) - rank(b.data() as OrderEmailEvent))
  for (const event of pending) if (await sendOutboxEmail(event.id, send) === "pending") break
}
export async function retryPendingEmails(send: EmailSender = sendTransactionalEmail) {
  const pending = await getAdminDb().collection("emailOutbox").where("status", "==", "pending").limit(50).get()
  for (const orderId of new Set(pending.docs.map(doc => doc.data().orderId as string))) await sendOrderEmail(orderId, send)
  return pending.size
}

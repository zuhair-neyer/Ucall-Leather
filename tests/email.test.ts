import { before, beforeEach, after, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { deleteApp, getApps } from "firebase-admin/app"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "../lib/firebase-admin"
import { createCheckoutOrder, fulfillCapturedPayment, cancelOrder, recordRefundedPayment, updateOrderStatus, type CheckoutInput } from "../lib/server/orders"
import { renderOrderEmail, retryPendingEmails, sendOrderEmail, sendOutboxEmail, type EmailSender, type OrderEmailEvent } from "../lib/server/email"
import type { EmailOrderSnapshot } from "../lib/server/email-events"

process.env.FIREBASE_PROJECT_ID = "demo-ucall"
const buyer = { uid: "alice", email: "alice@example.com" }
const input = (paymentMethod: "cod" | "razorpay" = "cod"): CheckoutInput => ({ items: [{ id: "belt", quantity: 1 }], paymentMethod, address: { name: "Alice Customer", email: buyer.email, phone: "9335228107", address: "600 C Block", city: "Kanpur", state: "Uttar Pradesh", pincode: "208010" } })
const payment = { id: "pay_email", orderId: "order_email", amount: 137900, currency: "INR" }
type SentEmail = Parameters<EmailSender>[0]
const event = async (id: string) => (await getAdminDb().collection("emailOutbox").doc(id).get()).data() as OrderEmailEvent & { snapshot: EmailOrderSnapshot }
before(() => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Run only through pnpm test:emulators") })
beforeEach(async () => {
  const db = getAdminDb()
  for (const name of ["products", "orders", "emailOutbox", "paymentReceipts", "refunds", "verifiedPurchases"]) await db.recursiveDelete(db.collection(name))
  await db.collection("products").doc("belt").set({ name: "Belt", price: 1000, stock: 10, image: "/category-belts.webp" })
})
after(async () => { await Promise.all(getApps().map(deleteApp)) })

test("each real status transition queues one immutable email; tracking edits and retries do not duplicate", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  await Promise.all([updateOrderStatus(id, "confirmed"), updateOrderStatus(id, "confirmed")])
  await updateOrderStatus(id, "shipped", { carrier: "Courier", number: "TRACK-ORIGINAL", url: "https://example.com/track/original" })
  await updateOrderStatus(id, "shipped", { carrier: "Courier", number: "TRACK-EDITED", url: "https://example.com/track/edited" })
  await updateOrderStatus(id, "delivered")
  await updateOrderStatus(id, "delivered")
  assert.equal((await getAdminDb().collection("emailOutbox").get()).size, 4)
  const confirmed = await event(`${id}_status_confirmed`), shipped = await event(`${id}_status_shipped`), delivered = await event(`${id}_status_delivered`)
  assert.equal(confirmed.snapshot.status, "confirmed")
  assert.equal(shipped.snapshot.tracking?.number, "TRACK-ORIGINAL")
  assert.equal(delivered.snapshot.paymentStatus, "paid")
  const content = renderOrderEmail(shipped)
  assert.match(content.subject, /Your UCALL order has shipped/)
  assert.match(content.text, /TRACK-ORIGINAL/)
  assert.match(content.text, /https:\/\/example.com\/track\/original/)
  assert.match(content.text, /IST/)
  assert.match(content.text, new RegExp(`/orders/${id}/support`))
  assert.doesNotMatch(content.text, /Order status at this update: Delivered/)
  const sent: SentEmail[] = []
  await sendOrderEmail(id, async message => { sent.push(message) })
  assert.equal(sent.length, 5) // Receipt to customer and owner; three status updates to customer.
  assert.match(sent[2].subject, /is confirmed/)
  assert.match(sent[3].subject, /has shipped/)
  assert.match(sent[4].subject, /was delivered/)
  await updateOrderStatus(id, "delivered")
  await sendOrderEmail(id, async message => { sent.push(message) })
  assert.equal(sent.length, 5)
  assert.equal((await event(`${id}_status_delivered`)).status, "sent")
})

test("Razorpay capture sends a single confirmed event and duplicate capture cannot reset it", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await Promise.all([fulfillCapturedPayment(id, payment), fulfillCapturedPayment(id, payment)])
  const queued = await getAdminDb().collection("emailOutbox").get()
  assert.equal(queued.size, 1)
  assert.equal(queued.docs[0].id, `${id}_status_confirmed`)
  assert.equal(queued.docs[0].data().kind, "confirmation")
  assert.equal(queued.docs[0].data().snapshot.paymentStatus, "paid")
  await sendOrderEmail(id, async () => undefined)
  await fulfillCapturedPayment(id, payment)
  assert.equal((await event(`${id}_status_confirmed`)).status, "sent")
})

test("customer cancellation and late capture preserve separate truthful cancellation and refund snapshots", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await cancelOrder(id, buyer.uid, false)
  await cancelOrder(id, buyer.uid, false)
  await fulfillCapturedPayment(id, payment)
  const cancelled = await event(`${id}_status_cancelled`), refund = await event(`${id}_payment_refund_needed`)
  assert.equal(cancelled.snapshot.paymentStatus, "failed")
  assert.equal(refund.snapshot.paymentStatus, "refund_needed")
  assert.match(renderOrderEmail(refund).text, /does not confirm a completed refund/)
  await recordRefundedPayment(id, payment)
  await recordRefundedPayment(id, payment)
  assert.equal((await getAdminDb().collection("emailOutbox").get()).size, 3)
  assert.equal((await event(`${id}_payment_refunded`)).snapshot.paymentStatus, "refunded")
})

test("provider-induced cancellation queues a cancelled email with refund-needed facts", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await getAdminDb().collection("products").doc("belt").update({ stock: 0 })
  await fulfillCapturedPayment(id, payment)
  const cancelled = await event(`${id}_status_cancelled`)
  assert.equal(cancelled.snapshot.status, "cancelled")
  assert.equal(cancelled.snapshot.paymentStatus, "refund_needed")
  assert.match(renderOrderEmail(cancelled).subject, /was cancelled/)
})

test("partial delivery retries only the unsent recipient with stable event keys", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  const attempted: SentEmail[] = []
  await sendOrderEmail(id, async message => { attempted.push(message); if (attempted.length === 2) throw new Error("Temporary SMTP failure") })
  const pending = await event(`${id}_confirmation`)
  assert.equal(pending.status, "pending")
  assert.equal(pending.customerSent, true)
  assert.equal(pending.ownerSent, undefined)
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()?.status, "pending")
  await retryPendingEmails(async message => { attempted.push(message) })
  assert.equal(attempted.length, 3)
  assert.equal(attempted[1].idempotencyKey, attempted[2].idempotencyKey)
  assert.equal((await event(`${id}_confirmation`)).status, "sent")
})

test("concurrent mail workers respect the event lease", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  let started!: () => void, release!: () => void
  const ready = new Promise<void>(resolve => { started = resolve }), blocked = new Promise<void>(resolve => { release = resolve })
  const sent: SentEmail[] = []
  const sending = sendOutboxEmail(`${id}_confirmation`, async message => { sent.push(message); if (sent.length === 1) { started(); await blocked } })
  await ready
  assert.equal(await sendOutboxEmail(`${id}_confirmation`, async message => { sent.push(message) }), "pending")
  assert.equal(sent.length, 1)
  release()
  assert.equal(await sending, "sent")
  assert.equal(sent.length, 2)
})

test("an earlier leased event keeps later status emails in order", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  await updateOrderStatus(id, "confirmed")
  await getAdminDb().collection("emailOutbox").doc(`${id}_confirmation`).update({ leaseUntil: Timestamp.fromMillis(Date.now() + 60_000), leaseToken: "another-worker" })
  const sent: SentEmail[] = []
  await sendOrderEmail(id, async message => { sent.push(message) })
  assert.equal(sent.length, 0)
  assert.equal((await event(`${id}_status_confirmed`)).attempts, 0)
})

test("legacy pending confirmations are upgraded truthfully and same recipient is not mailed twice", async () => {
  const { id } = await createCheckoutOrder({ uid: buyer.uid, email: "UCALLLEATHER.INDIA@gmail.com" }, input(), randomUUID())
  await getAdminDb().collection("emailOutbox").doc(`${id}_confirmation`).set({ orderId: id, status: "pending", attempts: 0, createdAt: Timestamp.fromMillis(1000) })
  const sent: SentEmail[] = []
  await sendOrderEmail(id, async message => { sent.push(message) })
  assert.equal(sent.length, 1)
  assert.match(sent[0].text, /Current status checked/)
  assert.equal((await event(`${id}_confirmation`)).legacySnapshot, true)
})

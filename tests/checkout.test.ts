import { before, beforeEach, after, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { deleteApp, getApps } from "firebase-admin/app"
import { getAdminDb } from "../lib/firebase-admin"
import { createCheckoutOrder, fulfillCapturedPayment, cancelOrder, markPaymentFailed, recordRefundedPayment, updateOrderStatus, type CheckoutInput } from "../lib/server/orders"
process.env.FIREBASE_PROJECT_ID = "demo-ucall"
const address = { name: "Test Customer", email: "customer@example.com", phone: "9335228107", address: "600 C Block", city: "Kanpur", state: "Uttar Pradesh", pincode: "208010" }
const buyer = { uid: "alice", email: "alice@example.com" }
const input = (method: "cod" | "razorpay" = "cod"): CheckoutInput => ({ items: [{ id: "belt", quantity: 1 }], address, paymentMethod: method })
before(() => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Run this only through pnpm test:emulators") })
beforeEach(async () => {
  const db = getAdminDb()
  for (const name of ["products", "orders", "emailOutbox", "paymentReceipts", "refunds", "verifiedPurchases"]) await db.recursiveDelete(db.collection(name))
  await db.collection("products").doc("belt").set({ name: "Belt", price: 1000.25, stock: 1, image: "/category-belts.webp" })
})
after(async () => { await Promise.all(getApps().map(deleteApp)) })
test("server snapshots prices and COD retry deducts stock once", async () => {
  const key = randomUUID(), first = await createCheckoutOrder(buyer, input(), key), retry = await createCheckoutOrder(buyer, input(), key)
  assert.equal(first.id, retry.id)
  assert.equal(first.order.total, 1379.30)
  assert.deepEqual(first.order.gst, { rate: 18, pricing: "exclusive", taxableAmount: 1000.25, amount: 180.05 })
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 0)
  assert.equal((await getAdminDb().collection("orders").get()).size, 1)
  assert.equal((await getAdminDb().collection("emailOutbox").get()).size, 1)
  await assert.rejects(createCheckoutOrder(buyer, { ...input(), address: { ...address, city: "Lucknow" } }, key), /already used/)
})
test("two concurrent buyers cannot both buy the last unit", async () => {
  const results = await Promise.allSettled([createCheckoutOrder(buyer, input(), randomUUID()), createCheckoutOrder({ uid: "bob", email: "bob@example.com" }, input(), randomUUID())])
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 0)
})
test("retrying an existing pre-GST checkout preserves its original charge", async () => {
  const key = randomUUID(), first = await createCheckoutOrder(buyer, input(), key)
  const ref = getAdminDb().collection("orders").doc(first.id)
  const legacy = { ...first.order, total: 1199.25 }
  delete legacy.gst
  await ref.set(legacy)
  const retry = await createCheckoutOrder(buyer, input(), key)
  assert.equal(retry.created, false)
  assert.equal(retry.order.total, 1199.25)
  assert.equal(retry.order.gst, undefined)
})
test("multi-item shortage commits neither order nor partial stock deduction", async () => {
  await getAdminDb().collection("products").doc("wallet").set({ name: "Wallet", price: 500, stock: 0, image: "/category-wallets.webp" })
  await assert.rejects(createCheckoutOrder(buyer, { ...input(), items: [{ id: "belt", quantity: 1 }, { id: "wallet", quantity: 1 }] }, randomUUID()))
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
  assert.equal((await getAdminDb().collection("orders").get()).size, 0)
})
test("webhook and browser verification racing fulfill a captured payment exactly once", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  const payment = { id: "pay_one", orderId: "order_one", amount: 137930, currency: "INR" }
  await Promise.all([fulfillCapturedPayment(id, payment), fulfillCapturedPayment(id, payment)])
  const order = (await getAdminDb().collection("orders").doc(id).get()).data()!
  assert.equal(order.paymentStatus, "paid"); assert.equal(order.status, "confirmed")
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 0)
  await markPaymentFailed(id, "order_one")
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()!.paymentStatus, "paid")
})
test("late captured payment after stock runs out is recorded for refund", async () => {
  const prepaid = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await createCheckoutOrder({ uid: "bob", email: "bob@example.com" }, input(), randomUUID())
  const result = await fulfillCapturedPayment(prepaid.id, { id: "pay_late", orderId: "order_late", amount: 137930, currency: "INR" })
  assert.equal(result.paymentStatus, "refund_needed")
  assert.equal((await getAdminDb().collection("refunds").doc("pay_late").get()).exists, true)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 0)
})
test("cancellation is owner scoped, restocks once, and blocks late shipment", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  await assert.rejects(cancelOrder(id, "bob", false), /cannot access/)
  await cancelOrder(id, buyer.uid, false); await cancelOrder(id, buyer.uid, false)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
  await assert.rejects(updateOrderStatus(id, "confirmed"))
})
test("paid cancellation flags refund, duplicate payment never takes another unit", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await fulfillCapturedPayment(id, { id: "pay_original", orderId: "order_one", amount: 137930, currency: "INR" })
  await fulfillCapturedPayment(id, { id: "pay_duplicate", orderId: "order_one", amount: 137930, currency: "INR" })
  assert.equal((await getAdminDb().collection("refunds").doc("pay_duplicate").get()).exists, true)
  await cancelOrder(id, "admin", true); await cancelOrder(id, "admin", true)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()!.paymentStatus, "refund_needed")
})
test("captured payment after cancellation requires refund without reducing stock", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await cancelOrder(id, buyer.uid, false)
  assert.equal((await fulfillCapturedPayment(id, { id: "pay_cancelled", orderId: "order_cancelled", amount: 137930, currency: "INR" })).paymentStatus, "refund_needed")
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
})
test("wrong currency and amount cannot mark order paid", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  await assert.rejects(fulfillCapturedPayment(id, { id: "pay_forged", orderId: "order_forged", amount: 1, currency: "INR" }))
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()!.paymentStatus, "awaiting_payment")
})
test("admin delivery creates verified-purchase entitlement only after fulfillment", async () => {
  const { id } = await createCheckoutOrder(buyer, input(), randomUUID())
  await assert.rejects(updateOrderStatus(id, "delivered"))
  await updateOrderStatus(id, "confirmed"); await updateOrderStatus(id, "shipped"); await updateOrderStatus(id, "delivered")
  assert.equal((await getAdminDb().collection("verifiedPurchases").doc("belt_alice").get()).exists, true)
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()!.paymentStatus, "paid")
})
test("a delayed capture for an already refunded payment cannot allocate stock", async () => {
  const { id } = await createCheckoutOrder(buyer, input("razorpay"), randomUUID())
  const payment = { id: "pay_refunded", orderId: "order_refunded", amount: 137930, currency: "INR" }
  await recordRefundedPayment(id, payment)
  await recordRefundedPayment(id, payment)
  assert.equal((await getAdminDb().collection("orders").doc(id).get()).data()!.paymentStatus, "refunded")
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
})

async function legacyOrder(id: string, status: string, extra: Record<string, unknown> = {}) {
  await getAdminDb().collection("orders").doc(id).set({
    userId: buyer.uid, userEmail: buyer.email, userName: "Legacy Customer", status,
    paymentMethod: "Cash on Delivery", items: [{ id: "belt", name: "Belt", price: 1000.25, quantity: 1, image: "/category-belts.webp" }],
    subtotal: 1000.25, shipping: 199, total: 1199.25, shippingAddress: address, ...extra,
  })
}

test("legacy shipped COD can be delivered without changing or inventing stock allocation", async () => {
  await legacyOrder("legacy-shipped", "shipped")
  await updateOrderStatus("legacy-shipped", "delivered")
  const order = (await getAdminDb().collection("orders").doc("legacy-shipped").get()).data()!
  assert.equal(order.status, "delivered")
  assert.equal(order.paymentMethod, "cod")
  assert.equal(order.paymentStatus, "paid")
  assert.equal(Object.hasOwn(order, "stockDeducted"), false)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
  await updateOrderStatus("legacy-shipped", "delivered", { carrier: "Courier", number: "LEGACY123", url: "" })
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
})

test("editing tracking on a delivered legacy COD order does not infer cash collection", async () => {
  await legacyOrder("legacy-delivered", "delivered")
  await updateOrderStatus("legacy-delivered", "delivered", { carrier: "Courier", number: "OLD123", url: "" })
  const order = (await getAdminDb().collection("orders").doc("legacy-delivered").get()).data()!
  assert.equal(order.paymentStatus, "cod_pending")
  assert.equal(Object.hasOwn(order, "stockDeducted"), false)
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
})

test("legacy pending cancellation does not invent restock and can be retried", async () => {
  await legacyOrder("legacy-pending", "pending")
  await assert.rejects(updateOrderStatus("legacy-pending", "confirmed"), /Stock has not been allocated/)
  await cancelOrder("legacy-pending", buyer.uid, false)
  await cancelOrder("legacy-pending", buyer.uid, false)
  const order = (await getAdminDb().collection("orders").doc("legacy-pending").get()).data()!
  assert.equal(order.status, "cancelled")
  assert.equal(order.paymentMethod, "cod")
  assert.equal(order.paymentStatus, "cod_pending")
  assert.equal((await getAdminDb().collection("products").doc("belt").get()).data()!.stock, 1)
})

test("legacy processing normalizes forward and explicit unallocated stock stays blocked", async () => {
  await legacyOrder("legacy-processing", "processing", { stockDeducted: true })
  await updateOrderStatus("legacy-processing", "shipped")
  assert.equal((await getAdminDb().collection("orders").doc("legacy-processing").get()).data()!.status, "shipped")
  await legacyOrder("unallocated-shipped", "shipped", { stockDeducted: false })
  await assert.rejects(updateOrderStatus("unallocated-shipped", "delivered"), /Stock has not been allocated/)
  await legacyOrder("unverified-prepaid", "shipped", { paymentMethod: "Razorpay", stockDeducted: true })
  await assert.rejects(updateOrderStatus("unverified-prepaid", "delivered"), /Wait for a captured payment/)
})

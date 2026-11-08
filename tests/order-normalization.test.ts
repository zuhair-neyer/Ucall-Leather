import test from "node:test"
import assert from "node:assert/strict"
import { canCompleteLegacyCodShipment, countsAsRevenue, normalizeOrder, paymentMethodLabel, paymentStatusLabel } from "../lib/order-normalization"

test("legacy COD reads use canonical vocabulary without inventing allocation or payment", () => {
  const source = { paymentMethod: "Cash on Delivery", status: "processing", total: 1449 }
  const order = normalizeOrder(source, "legacy-order")
  assert.equal(order.id, "legacy-order")
  assert.equal(order.paymentMethod, "cod")
  assert.equal(order.paymentStatus, "cod_pending")
  assert.equal(order.status, "confirmed")
  assert.equal(Object.hasOwn(order, "stockDeducted"), false)
  assert.equal(Object.hasOwn(source, "paymentStatus"), false)
  assert.equal(source.paymentMethod, "Cash on Delivery")
  assert.equal(paymentMethodLabel(order.paymentMethod), "Cash on Delivery")
  assert.equal(paymentStatusLabel(order), "Cash due on delivery")
})

test("legacy delivered and cancelled COD have truthful payment copy and revenue", () => {
  const delivered = normalizeOrder({ paymentMethod: "Cash on Delivery", status: "delivered" })
  const cancelled = normalizeOrder({ paymentMethod: "Cash on Delivery", status: "cancelled" })
  assert.equal(paymentStatusLabel(delivered), "Cash collection not recorded")
  assert.equal(paymentStatusLabel(cancelled), "No payment due")
  assert.equal(countsAsRevenue(delivered), false)
  assert.equal(countsAsRevenue(cancelled), false)
  assert.equal(countsAsRevenue(normalizeOrder({ paymentMethod: "cod", paymentStatus: "paid", status: "delivered" })), true)
  assert.equal(countsAsRevenue(normalizeOrder({ paymentMethod: "razorpay", paymentStatus: "paid", status: "cancelled" })), false)
})

test("legacy Razorpay metadata and fulfillment never imply captured payment", () => {
  for (const raw of [
    { paymentMethod: "Razorpay", status: "delivered" },
    { payment: { razorpay_payment_id: "pay_legacy", razorpay_signature: "unverified", status: "captured" }, status: "shipped" },
  ]) {
    const order = normalizeOrder(raw)
    assert.equal(order.paymentMethod, "razorpay")
    assert.equal(order.paymentStatus, "awaiting_payment")
    assert.equal(countsAsRevenue(order), false)
  }
  const unknown = normalizeOrder({ paymentMethod: "unsupported", paymentStatus: "toString", status: "pending" })
  assert.equal(paymentMethodLabel(unknown.paymentMethod), "Payment method unavailable")
  assert.notEqual(unknown.paymentStatus, "paid")
})

test("legacy allocation exception is restricted to dispatched COD with absent history", () => {
  for (const status of ["shipped", "delivered"]) assert.equal(canCompleteLegacyCodShipment(normalizeOrder({ paymentMethod: "Cash on Delivery", status })), true)
  for (const raw of [
    { paymentMethod: "Cash on Delivery", status: "pending" },
    { paymentMethod: "Cash on Delivery", status: "confirmed" },
    { paymentMethod: "Cash on Delivery", status: "shipped", stockDeducted: false },
    { paymentMethod: "razorpay", status: "shipped" },
  ]) assert.equal(canCompleteLegacyCodShipment(normalizeOrder(raw)), false)
})

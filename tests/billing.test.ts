import { test } from "node:test"
import assert from "node:assert/strict"
import { calculateBilling, recordedGst } from "../lib/billing"
import { normalizeOrder } from "../lib/order-normalization"
import { formatINR } from "../lib/format"

test("18% GST is added on merchandise and shipping stays separate", () => {
  assert.deepEqual(calculateBilling(1000, 199), { subtotal: 1000, shipping: 199, gst: { rate: 18, pricing: "exclusive", taxableAmount: 1000, amount: 180 }, total: 1379 })
  assert.equal(calculateBilling(5000, 0).total, 5900)
})

test("GST and final amount round once in paise, including half-paise tax", () => {
  const bill = calculateBilling(1000.25, 199)
  assert.equal(bill.gst.amount, 180.05)
  assert.equal(bill.total, 1379.30)
  assert.equal(calculateBilling(0.03, 0).gst.amount, 0.01)
  assert.equal(calculateBilling(0, 0).total, 0)
  assert.match(formatINR(bill.total), /1,379\.3/)
  assert.match(formatINR(1000.25), /1,000\.25/)
})

test("historic orders never acquire tax or a new amount due when read", () => {
  const order = normalizeOrder({ subtotal: 1000.25, shipping: 199, total: 1199.25, paymentMethod: "Cash on Delivery", status: "pending" })
  assert.equal(order.total, 1199.25)
  assert.equal(recordedGst(order), null)
  assert.equal(Object.hasOwn(order, "gst"), false)
})

test("an order retains its recorded GST amount rather than repricing history", () => {
  const bill = calculateBilling(1999.99, 199)
  const order = normalizeOrder({ ...bill, paymentMethod: "cod", status: "pending" })
  assert.deepEqual(recordedGst(order), bill.gst)
  assert.equal(order.total, 2558.99)
  assert.equal(recordedGst({ gst: { ...bill.gst, amount: Number.NaN } }), null)
})

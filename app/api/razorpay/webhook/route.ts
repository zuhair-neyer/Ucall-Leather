import { after, NextResponse } from "next/server"
import { z } from "zod"
import { errorResponse, HttpError, readText } from "@/lib/server/http"
import { fulfillCapturedPayment, markPaymentFailed, recordRefundedPayment, toPaise, type OrderRecord } from "@/lib/server/orders"
import { getRazorpay, validSignature } from "@/lib/server/razorpay"
import { getAdminDb } from "@/lib/firebase-admin"
import { sendOrderEmail } from "@/lib/server/email"
import { productIdSchema } from "@/lib/validation"
const paymentSchema = z.object({ id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/), amount: z.number().int().positive(), currency: z.string(), status: z.string() })
export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const raw = await readText(request, 262144), secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) throw new HttpError(503, "Webhook is not configured")
    if (!validSignature(raw, request.headers.get("x-razorpay-signature") || "", secret)) throw new HttpError(400, "Invalid webhook signature")
    const event = z.object({ event: z.string(), payload: z.unknown().optional() }).parse(JSON.parse(raw))
    if (!["payment.captured", "payment.failed"].includes(event.event)) return NextResponse.json({ received: true })
    const payload = z.object({ payment: z.object({ entity: paymentSchema }) }).parse(event.payload)
    const payment = payload.payment.entity
    if ((event.event === "payment.captured" && payment.status !== "captured") || (event.event === "payment.failed" && payment.status !== "failed")) throw new HttpError(400, "Invalid payment event")
    const providerOrder = await getRazorpay().orders.fetch(payment.order_id)
    const idResult = productIdSchema.safeParse(providerOrder.notes?.storeOrderId)
    // Ignore payments from other applications sharing this merchant account.
    if (!idResult.success) return NextResponse.json({ received: true, ignored: true })
    const orderId = idResult.data
    const order = (await getAdminDb().collection("orders").doc(orderId).get()).data() as OrderRecord | undefined
    if (!order) throw new HttpError(503, "Order is temporarily unavailable; retry delivery")
    if (Number(providerOrder.amount) !== toPaise(order.total) || providerOrder.currency !== "INR") throw new HttpError(400, "Provider order amount mismatch")
    if (event.event === "payment.captured") {
      const current = await getRazorpay().payments.fetch(payment.id)
      if (current.order_id !== payment.order_id || Number(current.amount) !== payment.amount || current.currency !== payment.currency) throw new HttpError(400, "Payment does not match the event")
      const details = { id: payment.id, orderId: payment.order_id, amount: payment.amount, currency: payment.currency }
      if (current.status === "refunded" && Number(current.amount_refunded) === payment.amount) await recordRefundedPayment(orderId, details)
      else if (current.status === "captured" && Number(current.amount_refunded || 0) === 0) await fulfillCapturedPayment(orderId, details)
      else throw new HttpError(409, "Payment needs manual reconciliation before fulfillment")
      after(() => sendOrderEmail(orderId))
    } else if (order.razorpay?.orderId) await markPaymentFailed(orderId, payment.order_id)
    return NextResponse.json({ received: true })
  } catch (error) { return errorResponse(error) }
}

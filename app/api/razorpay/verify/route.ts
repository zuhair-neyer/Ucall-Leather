import { after, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase-admin"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, HttpError, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { fulfillCapturedPayment, toPaise, type OrderRecord } from "@/lib/server/orders"
import { getRazorpay, validSignature } from "@/lib/server/razorpay"
import { sendOrderEmail } from "@/lib/server/email"
const schema = z.object({ orderId: productIdSchema, razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) }).strict()
export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const user = await requireUser(request), input = await readJson(request, schema)
    await rateLimit(user.uid, "verify")
    const order = (await getAdminDb().collection("orders").doc(input.orderId).get()).data() as OrderRecord | undefined
    if (!order || order.userId !== user.uid) throw new HttpError(404, "Order not found")
    const gateway = getRazorpay()
    if (order.razorpay?.orderId !== input.razorpay_order_id || !validSignature(`${input.razorpay_order_id}|${input.razorpay_payment_id}`, input.razorpay_signature, process.env.RAZORPAY_KEY_SECRET!)) throw new HttpError(400, "Payment verification failed")
    const payment = await gateway.payments.fetch(input.razorpay_payment_id)
    if (payment.order_id !== input.razorpay_order_id || Number(payment.amount) !== toPaise(order.total) || payment.currency !== "INR") throw new HttpError(400, "Payment does not match the order")
    if (payment.status !== "captured") {
      if (payment.status === "authorized") return NextResponse.json({ orderId: input.orderId, paymentStatus: "awaiting_payment" }, { status: 202 })
      throw new HttpError(400, "Payment has not been captured")
    }
    const result = await fulfillCapturedPayment(input.orderId, { id: payment.id, orderId: payment.order_id, amount: Number(payment.amount), currency: payment.currency })
    after(() => sendOrderEmail(input.orderId))
    return NextResponse.json(result)
  } catch (error) { return errorResponse(error) }
}

import { after, NextResponse } from "next/server"
import { z } from "zod"
import { Timestamp } from "firebase-admin/firestore"
import { checkoutSchema } from "@/lib/validation"
import { getAdminDb } from "@/lib/firebase-admin"
import { errorResponse, HttpError, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { createCheckoutOrder, toPaise } from "@/lib/server/orders"
import { getRazorpay } from "@/lib/server/razorpay"
import { sendOrderEmail } from "@/lib/server/email"
export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const input = await readJson(request, checkoutSchema)
    const key = z.string().uuid().parse(request.headers.get("idempotency-key"))
    await rateLimit(user.uid, "checkout", 10)
    const gateway = input.paymentMethod === "razorpay" ? getRazorpay() : null
    const { id, order, created } = await createCheckoutOrder(user, input, key)
    if (order.paymentMethod === "cod") {
      after(() => sendOrderEmail(id))
      return NextResponse.json({ orderId: id, paymentMethod: "cod" })
    }
    if (order.status === "cancelled" || order.paymentStatus === "paid") return NextResponse.json({ orderId: id, paymentMethod: "razorpay", paymentStatus: order.paymentStatus })
    if (order.razorpay?.orderId) return NextResponse.json({ orderId: id, paymentMethod: "razorpay", razorpay: { id: order.razorpay.orderId, amount: toPaise(order.total), currency: "INR", keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID } })
    if (!created) throw new HttpError(409, "Payment setup is still pending. Check My Orders before trying a new checkout")
    // Persist first. notes.storeOrderId lets the webhook recover even when this
    // process stops after provider creation but before saving the provider ID.
    const providerOrder = await gateway!.orders.create({ amount: toPaise(order.total), currency: "INR", receipt: id,
      notes: { storeOrderId: id, userId: user.uid },
    })
    const ref = getAdminDb().collection("orders").doc(id)
    await getAdminDb().runTransaction(async tx => {
      const snap = await tx.get(ref)
      const existing = snap.data()?.razorpay ?? {}
      tx.update(ref, { razorpay: { ...existing, orderId: providerOrder.id }, updatedAt: Timestamp.now() })
    })
    return NextResponse.json({ orderId: id, paymentMethod: "razorpay", razorpay: { id: providerOrder.id, amount: Number(providerOrder.amount), currency: providerOrder.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID } })
  } catch (error) { return errorResponse(error) }
}

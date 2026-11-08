import { after, NextResponse } from "next/server"
import { z } from "zod"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { getRazorpay } from "@/lib/server/razorpay"
import { errorResponse, HttpError, readJson, requireAdmin } from "@/lib/server/http"
import { sendOrderEmail } from "@/lib/server/email"
import { queuePaymentEmail } from "@/lib/server/email-events"
import { normalizeOrder } from "@/lib/order-normalization"
export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    await readJson(request, z.object({}).strict())
    const id = z.string().regex(/^pay_[a-zA-Z0-9]+$/).parse((await params).id)
    const payment = await getRazorpay().payments.fetch(id)
    if (Number(payment.amount_refunded) !== Number(payment.amount) || payment.status !== "refunded") throw new HttpError(409, "Razorpay has not completed a full refund yet. Refund this payment in the Razorpay dashboard, then check again")
    const db = getAdminDb(), ref = db.collection("refunds").doc(id)
    const orderId = await db.runTransaction(async tx => {
      const refund = await tx.get(ref)
      if (!refund.exists) throw new HttpError(404, "Refund record not found")
      const orderRef = db.collection("orders").doc(refund.data()!.orderId), order = await tx.get(orderRef)
      const now = Timestamp.now()
      tx.update(ref, { status: "refunded", updatedAt: now })
      if (order.data()?.razorpay?.paymentId === id && order.data()?.paymentStatus === "refund_needed") {
        tx.update(orderRef, { paymentStatus: "refunded", updatedAt: now })
        queuePaymentEmail(tx, orderRef.id, { ...normalizeOrder(order.data()!, orderRef.id), paymentStatus: "refunded" }, now)
      }
      return orderRef.id
    })
    after(() => sendOrderEmail(orderId))
    return NextResponse.json({ paymentStatus: "refunded" })
  } catch (error) { return errorResponse(error) }
}

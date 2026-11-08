import { after, NextResponse } from "next/server"
import { z } from "zod"
import { productIdSchema } from "@/lib/validation"
import { ORDER_STATUSES } from "@/lib/order-status"
import { cancelOrder, updateOrderStatus } from "@/lib/server/orders"
import { errorResponse, rateLimit, readJson, requireAdmin } from "@/lib/server/http"
import { sendOrderEmail } from "@/lib/server/email"
const schema = z.object({ status: z.enum(ORDER_STATUSES), tracking: z.object({ carrier: z.string().trim().max(100), number: z.string().trim().max(100), url: z.string().max(2048).refine(v => v === "" || /^https:\/\//.test(v), "Tracking links must start with https://") }).strict().optional() }).strict()
export const runtime = "nodejs"
export const maxDuration = 60
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request), id = productIdSchema.parse((await params).id)
    const input = await readJson(request, schema)
    await rateLimit(user.uid, "order-status", 60)
    if (input.status === "cancelled") {
      const result = await cancelOrder(id, user.uid, true)
      after(() => sendOrderEmail(id))
      return NextResponse.json(result)
    }
    await updateOrderStatus(id, input.status, input.tracking)
    after(() => sendOrderEmail(id))
    return NextResponse.json({ orderId: id, status: input.status })
  } catch (error) { return errorResponse(error) }
}

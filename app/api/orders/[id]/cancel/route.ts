import { after, NextResponse } from "next/server"
import { z } from "zod"
import { productIdSchema } from "@/lib/validation"
import { cancelOrder } from "@/lib/server/orders"
import { errorResponse, isAdmin, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { sendOrderEmail } from "@/lib/server/email"
export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request)
    await readJson(request, z.object({}).strict())
    const id = productIdSchema.parse((await params).id)
    await rateLimit(user.uid, "cancel")
    const result = await cancelOrder(id, user.uid, await isAdmin(user.uid))
    after(() => sendOrderEmail(id))
    return NextResponse.json(result)
  } catch (error) { return errorResponse(error) }
}

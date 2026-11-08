import { NextResponse } from "next/server"
import { z } from "zod"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, rateLimit, readJson, requireAdmin } from "@/lib/server/http"
import { setSupportStatus } from "@/lib/server/support"
export const runtime = "nodejs"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request), id = productIdSchema.parse((await params).id)
    const input = await readJson(request, z.object({ status: z.enum(["open", "closed"]) }).strict())
    await rateLimit(user.uid, "support-status", 30)
    await setSupportStatus(id, input.status)
    return NextResponse.json({ ok: true })
  } catch (error) { return errorResponse(error) }
}

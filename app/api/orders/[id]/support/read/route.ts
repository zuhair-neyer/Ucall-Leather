import { NextResponse } from "next/server"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, isAdmin, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { markSupportRead, supportReadSchema } from "@/lib/server/support"
export const runtime = "nodejs"
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request), id = productIdSchema.parse((await params).id)
    const input = await readJson(request, supportReadSchema)
    await rateLimit(user.uid, "support-read", 120)
    await markSupportRead(id, { uid: user.uid, admin: await isAdmin(user.uid) }, input.lastMessageId)
    return NextResponse.json({ ok: true })
  } catch (error) { return errorResponse(error) }
}

import { NextResponse } from "next/server"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, isAdmin, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { sendSupportMessage, supportMessageSchema } from "@/lib/server/support"
export const runtime = "nodejs"
export const maxDuration = 30
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request), id = productIdSchema.parse((await params).id)
    const input = await readJson(request, supportMessageSchema)
    await rateLimit(user.uid, "support-message", 30)
    return NextResponse.json(await sendSupportMessage(id, { uid: user.uid, admin: await isAdmin(user.uid) }, input))
  } catch (error) { return errorResponse(error) }
}

import { NextResponse } from "next/server"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, rateLimit, readJson, requireUser } from "@/lib/server/http"
import { performSupportAction, supportActionSchema } from "@/lib/server/support"
export const runtime = "nodejs"
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request), id = productIdSchema.parse((await params).id)
    const input = await readJson(request, supportActionSchema)
    await rateLimit(user.uid, "support", 30)
    return NextResponse.json(await performSupportAction(id, { uid: user.uid, admin: false }, input))
  } catch (error) { return errorResponse(error) }
}

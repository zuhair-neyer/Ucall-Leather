import { NextResponse } from "next/server"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, isAdmin, rateLimit, requireUser } from "@/lib/server/http"
import { assertPhotoAccess, readPhotoBody, uploadSupportPhoto } from "@/lib/server/support-photos"

export const runtime = "nodejs"
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request), id = productIdSchema.parse((await params).id)
    const actor = { uid: user.uid, admin: await isAdmin(user.uid) }
    await assertPhotoAccess(id, actor)
    await rateLimit(user.uid, "support-photo", 12)
    let filename = "Photo"
    try { filename = decodeURIComponent(request.headers.get("x-file-name") || "Photo") } catch { /* Use a safe display name. */ }
    return NextResponse.json(await uploadSupportPhoto(id, actor, await readPhotoBody(request), request.headers.get("content-type")?.split(";")[0] || "", filename))
  } catch (error) { return errorResponse(error) }
}

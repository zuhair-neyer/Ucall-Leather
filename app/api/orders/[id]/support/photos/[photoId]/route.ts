import { z } from "zod"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, isAdmin, requireUser } from "@/lib/server/http"
import { getSupportPhoto } from "@/lib/server/support-photos"

export const runtime = "nodejs"
export async function GET(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const user = await requireUser(request), values = await params
    const id = productIdSchema.parse(values.id), photoId = z.string().regex(/^[a-f0-9]{64}$/).parse(values.photoId)
    const photo = await getSupportPhoto(id, { uid: user.uid, admin: await isAdmin(user.uid) }, photoId)
    return new Response(new Uint8Array(photo.bytes), { headers: {
      "Content-Type": photo.attachment.contentType, "Content-Length": String(photo.bytes.length),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="support-photo.jpg"',
    } })
  } catch (error) { return errorResponse(error) }
}

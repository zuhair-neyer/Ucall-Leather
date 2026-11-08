import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { productSchema } from "@/lib/validation"
import { errorResponse, rateLimit, readJson, requireAdmin } from "@/lib/server/http"
export const runtime = "nodejs"
export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request), input = await readJson(request, productSchema)
    await rateLimit(user.uid, "products", 60)
    const now = Timestamp.now()
    const ref = await getAdminDb().collection("products").add({ ...input, image: input.images[0], createdAt: now, updatedAt: now })
    return NextResponse.json({ id: ref.id })
  } catch (error) { return errorResponse(error) }
}

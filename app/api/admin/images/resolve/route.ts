import { NextResponse } from "next/server"
import { z } from "zod"
import { errorResponse, rateLimit, readJson, requireAdmin } from "@/lib/server/http"
import { resolveProductImage } from "@/lib/server/product-images"

export const runtime = "nodejs"
const schema = z.object({ url: z.string().trim().min(1).max(2048) }).strict()

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request)
    const { url } = await readJson(request, schema)
    await rateLimit(user.uid, "image-links", 30)
    return NextResponse.json({ url: await resolveProductImage(url) })
  } catch (error) { return errorResponse(error) }
}

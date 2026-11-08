import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase-admin"
import { productIdSchema } from "@/lib/validation"
import { errorResponse, readJson, requireAdmin } from "@/lib/server/http"
type Context = { params: Promise<{ id: string }> }
export const runtime = "nodejs"
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireAdmin(request)
    const id = productIdSchema.parse((await params).id), input = await readJson(request, z.object({ read: z.boolean() }).strict())
    await getAdminDb().collection("contacts").doc(id).update(input)
    return NextResponse.json({ updated: true })
  } catch (error) { return errorResponse(error) }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireAdmin(request)
    const id = productIdSchema.parse((await params).id)
    await getAdminDb().collection("contacts").doc(id).delete()
    return NextResponse.json({ deleted: true })
  } catch (error) { return errorResponse(error) }
}

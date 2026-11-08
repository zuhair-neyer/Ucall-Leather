import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase-admin"
import { productIdSchema, productSchema } from "@/lib/validation"
import { errorResponse, HttpError, rateLimit, readJson, requireAdmin } from "@/lib/server/http"
type Context = { params: Promise<{ id: string }> }
export const runtime = "nodejs"
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireAdmin(request), id = productIdSchema.parse((await params).id)
    const { expectedStock, ...input } = await readJson(request, productSchema.extend({ expectedStock: z.number().int().nonnegative() }))
    await rateLimit(user.uid, "products", 60)
    const db = getAdminDb(), ref = db.collection("products").doc(id)
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists) throw new HttpError(404, "Product not found")
      if (snap.data()!.stock !== expectedStock) throw new HttpError(409, "Stock changed while you were editing. Close and reopen this product before saving")
      tx.update(ref, { ...input, image: input.images[0], updatedAt: Timestamp.now() })
    })
    return NextResponse.json({ id })
  } catch (error) { return errorResponse(error) }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireAdmin(request), id = productIdSchema.parse((await params).id)
    await rateLimit(user.uid, "products", 60)
    const db = getAdminDb(), ref = db.collection("products").doc(id)
    await db.runTransaction(async tx => {
      const [product, orders] = await Promise.all([tx.get(ref), tx.get(db.collection("orders").where("productIds", "array-contains", id))])
      if (!product.exists) throw new HttpError(404, "Product not found")
      if (orders.docs.some(d => !["cancelled", "delivered"].includes(d.data().status))) throw new HttpError(409, "This product belongs to an open order. Complete or cancel those orders before deleting it")
      tx.delete(ref)
    })
    return NextResponse.json({ deleted: true })
  } catch (error) { return errorResponse(error) }
}

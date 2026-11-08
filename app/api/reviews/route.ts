import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { reviewSchema } from "@/lib/validation"
import { errorResponse, HttpError, rateLimit, readJson, requireUser } from "@/lib/server/http"
export const runtime = "nodejs"
export async function PUT(request: Request) {
  try {
    const user = await requireUser(request), input = await readJson(request, reviewSchema)
    await rateLimit(user.uid, "review", 10)
    const db = getAdminDb(), id = `${input.productId}_${user.uid}`, ref = db.collection("reviews").doc(id)
    await db.runTransaction(async tx => {
      const [purchase, existing, product, profile] = await tx.getAll(db.collection("verifiedPurchases").doc(id), ref, db.collection("products").doc(input.productId), db.collection("users").doc(user.uid))
      if (!product.exists) throw new HttpError(404, "Product not found")
      if (!purchase.exists) throw new HttpError(403, "You can review this product after your order is delivered")
      if (existing.exists) throw new HttpError(409, "You have already reviewed this product. Reviews cannot be edited")
      tx.create(ref, { ...input, userId: user.uid, userName: profile.data()?.name || "UCALL customer", createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
    })
    return NextResponse.json({ id })
  } catch (error) { return errorResponse(error) }
}

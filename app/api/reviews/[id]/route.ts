import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase-admin"
import { errorResponse, HttpError, isAdmin, rateLimit, requireUser } from "@/lib/server/http"
export const runtime = "nodejs"
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request), id = z.string().min(1).max(260).regex(/^[a-zA-Z0-9_-]+$/).parse((await params).id)
    await rateLimit(user.uid, "review", 30)
    const admin = await isAdmin(user.uid), db = getAdminDb(), ref = db.collection("reviews").doc(id)
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref)
      if (snap.exists && snap.data()!.userId !== user.uid && !admin) throw new HttpError(403, "You cannot delete this review")
      if (snap.exists) tx.delete(ref)
    })
    return NextResponse.json({ deleted: true })
  } catch (error) { return errorResponse(error) }
}

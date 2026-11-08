import "server-only"
import { createHash } from "node:crypto"
import { Timestamp } from "firebase-admin/firestore"
import sharp from "sharp"
import { getAdminDb } from "../firebase-admin"
import { HttpError } from "./http"
import type { SupportActor } from "./support"

export const MAX_SUPPORT_PHOTO_BYTES = 4 * 1024 * 1024
export const MAX_STORED_PHOTO_BYTES = 350 * 1024
export interface SupportAttachment { id: string; name: string; contentType: string; width: number; height: number; size: number }
const allowedTypes: Record<string, string[]> = { "image/jpeg": ["jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/avif": ["avif", "heif"] }

export async function readPhotoBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_SUPPORT_PHOTO_BYTES) throw new HttpError(413, "Choose a photo smaller than 4 MB")
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, "Choose a photo to send")
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_SUPPORT_PHOTO_BYTES) { await reader.cancel(); throw new HttpError(413, "Choose a photo smaller than 4 MB") }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function prepareSupportPhoto(bytes: Buffer, contentType: string) {
  if (!bytes.length || bytes.length > MAX_SUPPORT_PHOTO_BYTES) throw new HttpError(413, "Choose a photo smaller than 4 MB")
  if (!allowedTypes[contentType]) throw new HttpError(400, "Choose a JPG, PNG, WebP or AVIF photo")
  try {
    const options = { limitInputPixels: 24_000_000, failOn: "error" as const }
    const metadata = await sharp(bytes, options).metadata()
    if (!metadata.format || !allowedTypes[contentType].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error("Invalid image")
    // Re-encoding strips location metadata and rejects scripts masquerading as photos.
    for (const [dimension, quality] of [[1600, 78], [1280, 65], [1024, 50]]) {
      const result = await sharp(bytes, options).rotate().resize(dimension, dimension, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality }).toBuffer({ resolveWithObject: true })
      if (result.data.length <= MAX_STORED_PHOTO_BYTES) return { bytes: result.data, width: result.info.width, height: result.info.height }
    }
  } catch { throw new HttpError(400, "This photo could not be read. Please choose a valid JPG, PNG, WebP or AVIF image") }
  throw new HttpError(413, "This photo is too detailed. Please send a smaller image")
}

export async function assertPhotoAccess(orderId: string, actor: SupportActor) {
  const order = await getAdminDb().collection("orders").doc(orderId).get()
  if (!order.exists || (!actor.admin && order.data()?.userId !== actor.uid)) throw new HttpError(404, "Order not found")
}

export async function uploadSupportPhoto(orderId: string, actor: SupportActor, bytes: Buffer, contentType: string, filename: string) {
  await assertPhotoAccess(orderId, actor)
  const prepared = await prepareSupportPhoto(bytes, contentType)
  const id = createHash("sha256").update(actor.uid).update(prepared.bytes).digest("hex")
  const name = (filename.split(/[\\/]/).pop() || "Photo").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) || "Photo"
  const attachment: SupportAttachment = { id, name, contentType: "image/jpeg", width: prepared.width, height: prepared.height, size: prepared.bytes.length }
  const db = getAdminDb(), threadRef = db.collection("supportThreads").doc(orderId), ref = threadRef.collection("photos").doc(id)
  return db.runTransaction(async tx => {
    const [order, thread, existing] = await tx.getAll(db.collection("orders").doc(orderId), threadRef, ref)
    if (!order.exists || (!actor.admin && order.data()?.userId !== actor.uid)) throw new HttpError(404, "Order not found")
    if (!thread.exists || thread.data()?.status !== "open") throw new HttpError(409, "Start or reopen the conversation before adding photos")
    if (existing.exists) return { attachment: existing.data()!.attachment as SupportAttachment }
    if ((thread.data()?.photoCount || 0) >= 100) throw new HttpError(409, "This conversation has reached its photo limit. Please contact the UCALL team")
    tx.create(ref, { attachment, bytes: prepared.bytes, uploaderId: actor.uid, createdAt: Timestamp.now() })
    tx.update(threadRef, { photoCount: (thread.data()?.photoCount || 0) + 1 })
    return { attachment }
  })
}

export async function getSupportPhoto(orderId: string, actor: SupportActor, photoId: string) {
  await assertPhotoAccess(orderId, actor)
  const snap = await getAdminDb().collection("supportThreads").doc(orderId).collection("photos").doc(photoId).get()
  if (!snap.exists) throw new HttpError(404, "Photo not found")
  return { attachment: snap.data()!.attachment as SupportAttachment, bytes: snap.data()!.bytes as Buffer }
}

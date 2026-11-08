import "server-only"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "node:crypto"
import { adminConfigured, getAdminAuth, getAdminDb } from "../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import { hasAdminAccess } from "../admin-access"
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function readText(request: Request, limit = 65536) {
  const reader = request.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) { await reader.cancel(); throw new HttpError(413, "Request is too large") }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString("utf8")
}
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const raw = await readText(request)
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new HttpError(400, "Send a valid JSON request") }
  return schema.parse(value)
}
export async function requireUser(request: Request) {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ") || header.length > 8192) throw new HttpError(401, "Please sign in to continue")
  if (!adminConfigured()) throw new HttpError(503, "The store's order service is being configured. Please contact the store for assistance")
  try { return await getAdminAuth().verifyIdToken(header.slice(7), true) }
  catch { throw new HttpError(401, "Your session expired. Please sign in again") }
}
export async function isAdmin(uid: string) {
  // Read the current Auth record as well as the protected profile. A stale role
  // or a token issued before an email change must not grant owner access.
  const [account, profile] = await Promise.all([
    getAdminAuth().getUser(uid),
    getAdminDb().collection("users").doc(uid).get(),
  ])
  return !account.disabled && hasAdminAccess(account.email, profile.data()?.role)
}
export async function requireAdmin(request: Request) {
  const user = await requireUser(request)
  if (!(await isAdmin(user.uid))) throw new HttpError(403, "Admin access is required")
  return user
}
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Check your details" }, { status: 400 })
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error("Store request failed", { type: error instanceof Error ? error.name : "UnknownError" })
  return NextResponse.json({ error: "We could not complete this request. Please try again or contact the store." }, { status: 500 })
}
export async function rateLimit(uid: string, action: string, limit = 30) {
  const db = getAdminDb(), minute = Math.floor(Date.now() / 60000)
  const ref = db.collection("rateLimits").doc(createHash("sha256").update(`${uid}:${action}:${minute}`).digest("hex"))
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref), count = snap.data()?.count ?? 0
    if (count >= limit) throw new HttpError(429, "Too many requests. Please wait a minute and try again")
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis((minute + 60) * 60000) })
  })
}

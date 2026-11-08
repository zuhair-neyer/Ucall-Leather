import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { retryPendingEmails } from "@/lib/server/email"
import { errorResponse } from "@/lib/server/http"
export const runtime = "nodejs"
export const maxDuration = 60
export async function GET(request: Request) {
  const actual = Buffer.from(request.headers.get("authorization") || ""), expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`)
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { return NextResponse.json({ processed: await retryPendingEmails() }) } catch (error) { return errorResponse(error) }
}

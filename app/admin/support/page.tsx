import type { Metadata } from "next"
import { Suspense } from "react"
import { SupportInbox } from "./support-inbox"

export const metadata: Metadata = { title: "Support chat", description: "Reply to UCALL customers about their orders." }

export default function SupportPage() {
  return <Suspense fallback={<p className="text-sm text-muted-foreground">Loading support chats…</p>}><SupportInbox /></Suspense>
}

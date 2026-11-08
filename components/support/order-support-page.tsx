"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { ArrowLeft, ChevronRight, Headphones, MapPin, MessageCircle, PackageSearch, RotateCcw, Zap } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { apiRequest } from "@/lib/client-api"
import { normalizeOrder } from "@/lib/order-normalization"
import { ORDER_STATUS_LABELS, type StoreOrder } from "@/lib/order-status"
import { Button } from "@/components/ui/button"
import { ChatConversation } from "./chat-conversation"
import type { SupportThread } from "./support-types"

const choices = [
  { action: "where_is_order", label: "Where is my order?", icon: PackageSearch },
  { action: "faster_delivery", label: "Faster delivery", icon: Zap },
  { action: "delivery_details", label: "Delivery & address help", icon: MapPin },
  { action: "cancel_return", label: "Cancellation, returns & refunds", icon: RotateCcw },
  { action: "chat_to_agent", label: "Chat to agent", icon: MessageCircle },
] as const
type SupportAction = typeof choices[number]["action"] | "request_agent"

export function OrderSupportPage({ orderId }: { orderId: string }) {
  const { user, isAdmin, loading: authLoading, isConfigured } = useAuth()
  const router = useRouter()
  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [thread, setThread] = useState<SupportThread | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState<SupportAction | "">("")
  const [retry, setRetry] = useState(0)
  const requestIds = useRef<Partial<Record<SupportAction, string>>>({})
  const validId = /^[a-zA-Z0-9_-]{1,120}$/.test(orderId)

  useEffect(() => {
    if (!authLoading && isAdmin) router.replace(`/admin/support?order=${encodeURIComponent(orderId)}`)
  }, [authLoading, isAdmin, router, orderId])

  useEffect(() => {
    if (!user || authLoading || isAdmin || !isConfigured || !validId) return
    setOrderLoading(true)
    setThreadLoading(true)
    setOrder(null)
    setThread(null)
    setLoadError("")
    setReply("")
    setActionError("")
    requestIds.current = {}
    const stopOrder = onSnapshot(doc(db, "orders", orderId), snapshot => {
      const next = snapshot.exists() ? normalizeOrder(snapshot.data(), snapshot.id) : null
      setOrder(next?.userId === user.uid ? next : null)
      setOrderLoading(false)
    }, () => { setLoadError("This order could not load. Sign in with the account that placed it, or try again."); setOrderLoading(false) })
    const stopThread = onSnapshot(doc(db, "supportThreads", orderId), snapshot => {
      setThread(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as SupportThread : null)
      setThreadLoading(false)
    }, () => { setLoadError("Your conversation could not load. Check your connection and try again."); setThreadLoading(false) })
    return () => { stopOrder(); stopThread() }
  }, [user, authLoading, isAdmin, isConfigured, validId, orderId, retry])

  async function selectAction(action: SupportAction) {
    if (!user || busy) return
    setBusy(action)
    setActionError("")
    requestIds.current[action] ??= crypto.randomUUID()
    try {
      const result = await apiRequest<{ reply: string }>(user, `/api/orders/${orderId}/support`, { action, requestId: requestIds.current[action] })
      setReply(result.reply)
      delete requestIds.current[action]
    } catch (error) { setActionError(error instanceof Error ? error.message : "Support is temporarily unavailable. Please try again.") }
    finally { setBusy("") }
  }

  const path = `/orders/${encodeURIComponent(orderId)}/support`
  if (authLoading || isAdmin) return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading support…</div>
  if (!user) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Order support</h1><p className="my-4">Sign in with the account used to place your order.</p><Button asChild className="min-h-11"><Link href={`/login?next=${encodeURIComponent(path)}`}>Sign in</Link></Button></div>
  if (!validId || !isConfigured || loadError) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Support unavailable</h1><p role="alert" className="my-4 text-muted-foreground">{loadError || "This order could not be loaded."}</p><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Try again</Button><Button asChild><Link href="/orders">Back to my orders</Link></Button></div></div>
  if (orderLoading || threadLoading || (order && order.userId !== user.uid)) return <div aria-label="Loading support" className="mx-auto max-w-6xl space-y-4 px-4 py-12"><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>
  if (!order) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Order not found</h1><Link href="/orders" className="mt-6 inline-flex min-h-11 items-center underline">Back to my orders</Link></div>
  const completed = order.status === "delivered" || order.status === "cancelled"
  return <div className="journey-page journey-support-page">
    <Link href={`/orders/${orderId}`} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-accent hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Back to order</Link>
    <header className="journey-support-header mb-6 flex items-start gap-3"><span className="journey-support-icon rounded-full bg-secondary p-3"><Headphones className="size-6 text-primary" aria-hidden="true" /></span><div className="min-w-0"><h1 className="font-serif text-3xl text-primary">Order support</h1><p className="mt-1 text-sm text-muted-foreground">We’re here to help with your UCALL order.</p><p className="mt-2 break-all text-xs text-muted-foreground">#{order.id} · {ORDER_STATUS_LABELS[order.status]}</p></div></header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4"><section className="journey-panel journey-support-options rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-serif text-xl text-primary">How can we help?</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{choices.map(({ action, label, icon: Icon }) => <Button key={action} variant={action === "chat_to_agent" ? "default" : "outline"} disabled={Boolean(busy) || (action === "faster_delivery" && completed)} onClick={() => void selectAction(action)} className={`h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left text-sm ${action === "chat_to_agent" ? "sm:col-span-2 lg:col-span-1" : ""}`}><Icon className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1">{busy === action ? "Please wait…" : label}</span><ChevronRight className="size-4 shrink-0" aria-hidden="true" /></Button>)}</div>{completed && <p className="mt-3 text-xs text-muted-foreground">Faster delivery is unavailable for delivered or cancelled orders.</p>}</section>
      {order.priority === "prioritised" && !completed && <p className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-3 text-sm font-semibold text-primary"><Zap className="size-4" aria-hidden="true" />Order prioritised</p>}
      {reply && <p role="status" className="rounded-lg border border-border bg-secondary p-4 text-sm leading-relaxed">{reply}</p>}
      </aside>
      <section aria-label="Chat with UCALL" className="journey-panel journey-chat-shell min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="journey-chat-header mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-xl text-primary">Chat with UCALL</h2><span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">{!thread ? "Order support" : thread.status === "closed" ? "Closed conversation" : thread.mode === "assistant" ? "AI assistant" : "UCALL team"}</span></div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{!thread || thread.mode === "assistant" ? "Chat to agent starts with our AI assistant. If it cannot resolve your issue, the conversation passes to our team. You can also choose Transfer to the team." : "Our team replies here when available. You can leave this page and return to the same conversation from your orders."}</p>
        {actionError && <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><p>{actionError}</p>{!thread && <Button variant="outline" className="mt-3 min-h-11" disabled={Boolean(busy)} onClick={() => void selectAction("chat_to_agent")}>Retry support</Button>}</div>}
        {thread ? <ChatConversation key={`${user.uid}:${thread.orderId}`} thread={thread} viewerRole="customer" fullPage /> : !actionError && <p role="status" className="py-12 text-center text-sm text-muted-foreground">{busy === "chat_to_agent" ? "Starting your conversation…" : "Choose Chat to agent to start a conversation."}</p>}
        {thread?.mode === "assistant" && thread.status === "open" && <Button type="button" variant="link" className="mt-2 h-auto min-h-11 whitespace-normal px-0 text-left" disabled={Boolean(busy)} onClick={() => void selectAction("request_agent")}>I still need help — transfer to the team</Button>}
      </section>
    </div>
  </div>
}


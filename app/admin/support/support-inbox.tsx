"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Check, MessageCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { adminRequest, errorMessage, useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { ChatConversation } from "@/components/support/chat-conversation"
import { supportTime, type SupportThread } from "@/components/support/support-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function SupportInbox() {
  const { data: threads, loading, error } = useAdminCollection<SupportThread>("supportThreads")
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("agent")
  const [busy, setBusy] = useState(false)
  const selectedOrder = searchParams.get("order")
  const sorted = [...threads].sort((a, b) => Number(b.unreadByAdmin) - Number(a.unreadByAdmin) || (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0))
  const filtered = sorted.filter(thread => (!filter || (filter === "unread" ? thread.unreadByAdmin : filter === "agent" ? thread.status === "open" && thread.mode !== "assistant" : filter === "assistant" ? thread.status === "open" && thread.mode === "assistant" : thread.status === filter)) && `${thread.userName} ${thread.userEmail} ${thread.orderId}`.toLowerCase().includes(search.toLowerCase()))
  const selected = selectedOrder ? threads.find(thread => thread.orderId === selectedOrder) : undefined
  const unreadCount = threads.filter(thread => thread.unreadByAdmin).length

  async function setStatus(thread: SupportThread) {
    setBusy(true)
    try {
      const status = thread.status === "open" ? "closed" : "open"
      await adminRequest(`/api/admin/support/${thread.orderId}`, "PATCH", { status })
      toast.success(status === "closed" ? "Conversation closed. The customer can reopen it if needed." : "Conversation reopened.")
    } catch (failure) { toast.error(errorMessage(failure)) }
    finally { setBusy(false) }
  }

  return <div className="journey-support-inbox">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-3xl text-primary">Support chat</h1><span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">{unreadCount} unread</span></div>
    <p className="mt-2 text-sm text-muted-foreground">Customer requests and unresolved AI conversations appear in Needs an agent. Read the full history, share photos and reply here.</p>
    <CollectionState loading={loading} error={error} empty={!threads.length} emptyMessage="No support conversations yet. Customer chat requests will appear here." />
    {!loading && !error && (threads.length > 0 || selectedOrder) && <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <section aria-label="Support inbox" className="journey-panel journey-inbox-list min-w-0 rounded-lg border border-border bg-card p-3">
        <Label htmlFor="support-search" className="sr-only">Search support chats</Label><Input id="support-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Customer, email or order" className="min-h-11" />
        <Label htmlFor="support-filter" className="sr-only">Filter support chats</Label><select id="support-filter" value={filter} onChange={event => setFilter(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="agent">Needs an agent</option><option value="assistant">With AI assistant</option><option value="open">All open conversations</option><option value="unread">Unread conversations</option><option value="closed">Closed conversations</option><option value="">All conversations</option></select>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain xl:max-h-[650px]">{!filtered.length ? <p className="p-3 text-sm text-muted-foreground">No conversations match these filters.</p> : filtered.map(thread => <button key={thread.id} type="button" aria-label={`Open chat for ${thread.userName || "Customer"}, order ${thread.orderId}`} aria-pressed={selected?.id === thread.id} onClick={() => router.replace(`/admin/support?order=${encodeURIComponent(thread.orderId)}`, { scroll: false })} className={cn("w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", selected?.id === thread.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60")}>
          <span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold">{thread.userName || "Customer"}</span>{thread.unreadByAdmin && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">New</span>}</span>
          <span className="mt-1 block break-all text-[10px] text-muted-foreground">#{thread.orderId}</span><span className="mt-2 line-clamp-2 block break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{thread.lastMessage}</span><span className="mt-2 block text-[10px] text-muted-foreground">{supportTime(thread.lastMessageAt)} IST · {thread.status === "open" ? "Open" : "Closed"}</span>
        </button>)}</div>
      </section>
      <section aria-label="Selected conversation" className="journey-panel journey-chat-shell min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5">
        {!selected ? <div className="flex min-h-72 flex-col items-center justify-center px-3 text-center"><MessageCircle className="size-10 text-accent" aria-hidden="true" /><h2 className="mt-4 font-serif text-xl text-primary">{selectedOrder ? "No chat request for this order yet" : "Choose a conversation"}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{selectedOrder ? "The customer can start a conversation using Get support, then Chat to agent on their order." : "Select a customer from the inbox to read messages and reply."}</p>{selectedOrder && <Link className="mt-4 inline-flex min-h-11 items-center break-all text-sm text-accent underline" href={`/orders/${encodeURIComponent(selectedOrder)}`}>View order</Link>}</div> : <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-serif text-xl text-primary">{selected.userName || "Customer"}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{selected.userEmail}</p><Link className="mt-1 inline-flex min-h-9 items-center break-all text-xs text-accent underline" href={`/orders/${selected.orderId}`}>View order #{selected.orderId}</Link></div><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void setStatus(selected)}>{selected.status === "open" ? <Check className="size-4" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}{busy ? "Saving…" : selected.status === "open" ? "Close conversation" : "Reopen conversation"}</Button></div>
          {selected.status === "open" && <p className="mb-4 rounded-md bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">{selected.mode === "assistant" ? "The AI assistant is helping this customer. Sending your reply will take over the conversation." : "This conversation is with your team. The AI assistant will not reply while you are helping the customer."}</p>}
          <ChatConversation key={selected.orderId} thread={selected} viewerRole="admin" />
        </>}
      </section>
    </div>}
  </div>
}


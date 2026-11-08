"use client"

import { useState } from "react"
import { toast } from "sonner"
import { adminRequest, errorMessage, useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ContactMessage { id: string; name: string; email: string; subject: string; message: string; read: boolean; createdAt?: { seconds: number } }

export default function AdminMessagesPage() {
  const { data: messages, loading, error } = useAdminCollection<ContactMessage>("contacts")
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [busy, setBusy] = useState("")
  const [deleting, setDeleting] = useState<ContactMessage | null>(null)
  const filtered = messages.filter(message => (!unreadOnly || !message.read) && `${message.name} ${message.email} ${message.subject} ${message.message}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
  const markRead = async (message: ContactMessage) => {
    setBusy(message.id)
    try { await adminRequest(`/api/admin/contacts/${message.id}`, "PATCH", { read: !message.read }) }
    catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }
  const deleteMessage = async () => {
    if (!deleting) return
    setBusy(deleting.id)
    try {
      await adminRequest(`/api/admin/contacts/${deleting.id}`, "DELETE")
      setDeleting(null)
      toast.success("Message deleted.")
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }

  return <div>
    <h1 className="font-serif text-3xl text-primary">Contact messages</h1>
    <p className="mt-1 text-sm text-muted-foreground">Messages saved through the store contact form.</p>
    <div className="mt-6 flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><Label htmlFor="message-search" className="sr-only">Search messages</Label><Input id="message-search" className="min-h-11" placeholder="Search messages" value={search} onChange={event => setSearch(event.target.value)} /></div><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} /> Unread only</label></div>
    <div className="mt-4 rounded-lg border border-border bg-card">
      <CollectionState loading={loading} error={error} empty={!filtered.length} emptyMessage={messages.length ? "No messages match these filters." : "No contact messages yet."} />
      {!loading && !error && <div className="divide-y divide-border">{filtered.map(message => <article key={message.id} className="p-5">
        <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-semibold text-primary">{message.subject}</h2>{!message.read && <Badge variant="secondary">Unread</Badge>}</div>
        <p className="mt-2 break-words text-sm">{message.name} · <a className="text-accent underline" href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a></p>
        {message.createdAt?.seconds && <p className="mt-1 text-xs text-muted-foreground">{new Date(message.createdAt.seconds * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>}
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.message}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" disabled={busy === message.id} onClick={() => void markRead(message)}>{message.read ? "Mark unread" : "Mark read"}</Button><Button className="min-h-11 text-destructive" variant="ghost" disabled={busy === message.id} onClick={() => setDeleting(message)}>Delete</Button></div>
      </article>)}</div>}
    </div>
    <Dialog open={Boolean(deleting)} onOpenChange={value => { if (!value && !busy) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete this message?</DialogTitle><DialogDescription>The message from {deleting?.name} will be permanently deleted. Keep it if a customer request still needs a reply.</DialogDescription></DialogHeader><DialogFooter><Button className="min-h-11" variant="outline" disabled={Boolean(busy)} onClick={() => setDeleting(null)}>Keep message</Button><Button className="min-h-11" variant="destructive" disabled={Boolean(busy)} onClick={() => void deleteMessage()}>{busy ? "Deleting…" : "Delete message"}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

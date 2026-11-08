"use client"

import { useEffect, useId, useRef, useState } from "react"
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore"
import { ImagePlus, Send, X } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { apiRequest } from "@/lib/client-api"
import { prepareSupportPhoto } from "@/lib/support-photo-client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supportTime, type SupportAttachment, type SupportMessage, type SupportThread } from "./support-types"
import { SupportPhoto } from "./support-photo"

export function ChatConversation({ thread, viewerRole, fullPage = false }: { thread: SupportThread; viewerRole: "customer" | "admin"; fullPage?: boolean }) {
  const { user } = useAuth()
  const inputId = useId()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [sendError, setSendError] = useState("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<SupportAttachment[]>([])
  const photoInput = useRef<HTMLInputElement>(null)
  const [retry, setRetry] = useState(0)
  const retryRequest = useRef<{ fingerprint: string; id: string } | null>(null)
  const history = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const markedRead = useRef("")
  const unread = viewerRole === "admin" ? thread.unreadByAdmin : thread.unreadByCustomer

  useEffect(() => {
    setMessages([])
    setLoading(true)
    setLoadError("")
    nearBottom.current = true
    return onSnapshot(query(collection(db, "supportThreads", thread.orderId, "messages"), orderBy("createdAt", "desc"), limit(100)), snapshot => {
      setMessages(snapshot.docs.map(document => ({ ...document.data(), id: document.id }) as SupportMessage).reverse())
      setLoading(false)
      setLoadError("")
    }, () => {
      setLoadError("Messages could not load. Check your connection and try again.")
      setLoading(false)
    })
  }, [thread.orderId, retry])

  useEffect(() => {
    if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!user || !unread || !thread.lastMessageId || markedRead.current === thread.lastMessageId || !messages.some(message => message.id === thread.lastMessageId)) return
    const messageId = thread.lastMessageId
    markedRead.current = messageId
    void apiRequest(user, `/api/orders/${thread.orderId}/support/read`, { lastMessageId: messageId }).catch(() => {
      if (markedRead.current === messageId) markedRead.current = ""
    })
  }, [user, unread, thread.orderId, thread.lastMessageId, messages])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const message = draft.trim()
    if (!user || (!message && !attachments.length) || sending || uploading || thread.status !== "open") return
    const attachmentIds = attachments.map(attachment => attachment.id)
    const fingerprint = JSON.stringify({ message, attachmentIds })
    if (retryRequest.current?.fingerprint !== fingerprint) retryRequest.current = { fingerprint, id: crypto.randomUUID() }
    setSending(true)
    setSendError("")
    try {
      await apiRequest(user, `/api/orders/${thread.orderId}/support/messages`, { message, attachmentIds, requestId: retryRequest.current.id })
      setDraft("")
      setAttachments([])
      retryRequest.current = null
      nearBottom.current = true
    } catch (error) { setSendError(error instanceof Error ? error.message : "Your message could not be sent. Please try again.") }
    finally { setSending(false) }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !user || uploading || sending) return
    const selected = Array.from(files)
    if (photoInput.current) photoInput.current.value = ""
    if (attachments.length + selected.length > 3) { setSendError("You can attach up to 3 photos per message."); return }
    setUploading(true)
    setSendError("")
    try {
      for (const file of selected) {
        const body = await prepareSupportPhoto(file)
        const token = await user.getIdToken()
        const response = await fetch(`/api/orders/${thread.orderId}/support/photos`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": body.type, "X-File-Name": encodeURIComponent(file.name.replace(/\.[^.]+$/, ".jpg").slice(0, 120)) }, body })
        const result = await response.json() as { attachment?: SupportAttachment; error?: string }
        if (!response.ok || !result.attachment) throw new Error(result.error || "Your photo could not upload. Please try again.")
        const attachment = result.attachment
        setAttachments(current => current.some(item => item.id === attachment.id) ? current : [...current, attachment])
      }
    } catch (error) { setSendError(error instanceof Error ? error.message : "Your photo could not upload. Please try again.") }
    finally { setUploading(false) }
  }

  return <div className="journey-chat-conversation min-w-0">
    <div ref={history} role="log" aria-label="Support conversation" aria-live="polite" aria-relevant="additions" aria-busy={loading}
      className={`${fullPage ? "h-[50dvh] min-h-72 max-h-[560px]" : "h-72 sm:h-96"} space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-border bg-background p-3 sm:p-4`}
      onLoadCapture={() => { if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight }}
      onScroll={() => { const element = history.current; if (element) nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80 }}>
      {loading ? <p className="text-sm text-muted-foreground">Loading messages…</p> : loadError ? <div role="alert" className="text-sm"><p className="text-destructive">{loadError}</p><Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => setRetry(value => value + 1)}>Retry messages</Button></div> : !messages.length ? <p className="text-sm text-muted-foreground">Start the conversation with a message below.</p> : <>
        {messages.length === 100 && <p className="text-center text-xs text-muted-foreground">Showing the latest 100 messages.</p>}
        {messages.map(message => message.senderRole === "system" ? <div key={message.id} className="mx-auto max-w-md rounded-md bg-secondary/60 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground"><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p><span className="mt-1 block text-[10px]">{supportTime(message.createdAt)} IST</span></div> : <div key={message.id} className={`flex ${message.senderRole === viewerRole ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-[90%] rounded-lg px-3 py-2 sm:max-w-[85%] ${message.senderRole === viewerRole ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}><p className="mb-1 text-xs font-semibold">{message.senderRole === viewerRole ? "You" : message.senderRole === "admin" ? "UCALL team" : message.senderRole === "assistant" ? "UCALL AI assistant" : thread.userName || "Customer"}</p>{message.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.text}</p>}{Boolean(message.attachments?.length) && <div className="mt-2 grid gap-3">{message.attachments!.map(attachment => <SupportPhoto key={attachment.id} orderId={thread.orderId} attachment={attachment} />)}</div>}<p className="mt-1 text-[10px] opacity-75">{supportTime(message.createdAt)} IST</p></div></div>)}
      </>}
    </div>
    {thread.mode === "assistant" && thread.aiPendingMessageId && <p role="status" className="mt-3 text-xs text-muted-foreground">The AI assistant is checking your order…</p>}
    {thread.status === "closed" ? <p role="status" className="mt-3 rounded-md bg-secondary p-3 text-sm text-muted-foreground">This conversation is closed. {viewerRole === "customer" ? "Choose Chat to agent to reopen it." : "Reopen the conversation to send a reply."}</p> : <form className="mt-4" onSubmit={send}>
      <Label htmlFor={inputId}>{viewerRole === "admin" ? "Reply to customer" : "Your message"}</Label>
      <Textarea id={inputId} value={draft} maxLength={2000} rows={3} disabled={sending} onChange={event => { setDraft(event.target.value); setSendError("") }} placeholder={viewerRole === "admin" ? "Write a reply…" : "Tell us how we can help with your order…"} className="mt-2 max-h-40 resize-y" aria-describedby={`${inputId}-count${sendError ? ` ${inputId}-error` : ""}`} />
      {attachments.length > 0 && <div aria-label="Attached photos" className="journey-chat-attachments mt-3 grid grid-cols-3 gap-2">{attachments.map(attachment => <div key={attachment.id} className="min-w-0 rounded-md border border-border p-2"><SupportPhoto orderId={thread.orderId} attachment={attachment} /><Button type="button" variant="ghost" className="mt-1 min-h-11 w-full px-1 text-xs" aria-label={`Remove photo ${attachment.name}`} disabled={sending || uploading} onClick={() => setAttachments(current => current.filter(item => item.id !== attachment.id))}><X className="size-3" aria-hidden="true" />Remove</Button></div>)}</div>}
      {sendError && <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-destructive">{sendError}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden aria-label="Attach support photos" onChange={event => void uploadPhotos(event.target.files)} /><Button type="button" variant="outline" className="min-h-11" disabled={sending || uploading || attachments.length >= 3 || loading || Boolean(loadError)} onClick={() => photoInput.current?.click()}><ImagePlus className="size-4" aria-hidden="true" />{uploading ? "Uploading…" : "Add photos"}</Button><Button type="submit" className="min-h-11" disabled={sending || uploading || (!draft.trim() && !attachments.length) || loading || Boolean(loadError)}><Send className="size-4" aria-hidden="true" />{sending ? "Sending…" : viewerRole === "admin" ? "Send reply" : "Send message"}</Button></div><div id={`${inputId}-count`} className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>Up to 3 photos · JPG, PNG, WebP or AVIF</span><span>{draft.length}/2,000</span></div>
    </form>}
  </div>
}


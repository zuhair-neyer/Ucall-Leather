import "server-only"
import { createHash } from "node:crypto"
import { Timestamp } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminDb } from "../firebase-admin"
import { DISPATCH_BUSINESS_DAYS, RETURN_WINDOW_DAYS } from "../config"
import { ORDER_STATUS_LABELS, type StoreOrder } from "../order-status"
import { normalizeOrder } from "../order-normalization"
import { HttpError } from "./http"
import { assistantConfigured, generateSupportReply, handoffReply, MAX_ASSISTANT_TURNS, requestedAgent } from "./support-ai"
import type { SupportAttachment } from "./support-photos"

export const supportActionSchema = z.object({
  action: z.enum(["where_is_order", "faster_delivery", "delivery_details", "cancel_return", "chat_to_agent", "start_assistant"]),
  requestId: z.uuid(),
}).strict()
export const supportMessageSchema = z.object({
  message: z.string().trim().max(2000, "Keep your message under 2,000 characters"),
  attachmentIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(3, "Send up to 3 photos at a time").optional(),
  requestId: z.uuid(),
}).strict().refine(value => value.message.length > 0 || Boolean(value.attachmentIds?.length), "Type a message or add a photo first")
  .refine(value => new Set(value.attachmentIds || []).size === (value.attachmentIds || []).length, "Each photo can only be attached once")
export const supportReadSchema = z.object({ lastMessageId: z.string().min(1).max(128) }).strict()
export interface SupportActor { uid: string; admin: boolean }
type SupportAction = z.infer<typeof supportActionSchema>["action"]
function checkAccess(order: StoreOrder | undefined, actor: SupportActor) {
  if (!order || (!actor.admin && order.userId !== actor.uid)) throw new HttpError(404, "Order not found")
}
function messageKey(actor: SupportActor, requestId: string) {
  return createHash("sha256").update(`${actor.uid}:${requestId}`).digest("hex")
}
export function supportReply(rawOrder: StoreOrder, action: SupportAction) {
  const order = normalizeOrder({ ...rawOrder })
  if (action === "where_is_order") {
    const tracking = order.tracking?.number ? ` Tracking: ${order.tracking.carrier} — ${order.tracking.number}. You can open the tracking link in your order details.` : ""
    if (order.status === "cancelled") return "Your order has been cancelled. Check the payment status in your order details for refund information, or choose Chat to agent for help."
    if (order.status === "delivered") return "Your order is marked delivered. If you haven't received it, choose Chat to agent so we can investigate."
    if (order.paymentMethod === "razorpay" && order.paymentStatus !== "paid") return "Your order is awaiting a confirmed payment. Check your order details for the latest payment status. If you were charged, choose Chat to agent before making another payment."
    return `Your order is ${ORDER_STATUS_LABELS[order.status]?.toLowerCase() || order.status}.${tracking}${order.status === "shipped" ? " Delivery timing depends on the courier and your location." : ` We normally dispatch within ${DISPATCH_BUSINESS_DAYS} business days.`}`
  }
  if (action === "faster_delivery") return `Order prioritised. Our team can now see your faster-delivery request.${order.status === "shipped" ? " Your parcel is already with the courier, so an earlier delivery cannot be guaranteed." : " We will review it as soon as possible; an earlier delivery cannot be guaranteed."}`
  if (action === "delivery_details") return `Your delivery address is shown in your order details. Orders normally dispatch within ${DISPATCH_BUSINESS_DAYS} business days. To request an address change, choose Chat to agent. Changes may not be possible after dispatch.`
  if (action === "cancel_return") return order.status === "pending"
    ? "You can cancel a pending order using Cancel order in your order details. For other help, choose Chat to agent."
    : `For cancellation, returns or refunds, choose Chat to agent. Return requests should be made within ${RETURN_WINDOW_DAYS} days of delivery, subject to our refund policy. Please do not send an item back before the team confirms the return.`
  if (action === "start_assistant") return assistantConfigured()
    ? "Hi, I’m UCALL’s AI support assistant. Tell me what you need help with. If I cannot resolve it, I’ll pass this conversation to our team. You can choose Chat to agent at any time."
    : "Our AI assistant is unavailable right now. " + handoffReply
  return "Your chat request has been sent. Leave your message below; the UCALL team will reply here when available."
}
export async function performSupportAction(orderId: string, actor: SupportActor, input: z.infer<typeof supportActionSchema>) {
  const db = getAdminDb(), orderRef = db.collection("orders").doc(orderId), threadRef = db.collection("supportThreads").doc(orderId)
  return db.runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef), order = orderSnap.data() as StoreOrder | undefined
    checkAccess(order, actor)
    if (actor.admin && order!.userId !== actor.uid) throw new HttpError(403, "Only the customer can request order support")
    const reply = supportReply(order!, input.action), now = Timestamp.now()
    if (input.action === "faster_delivery") {
      if (["cancelled", "delivered"].includes(order!.status)) throw new HttpError(409, "This order is already complete and cannot be prioritised. Choose Chat to agent for help")
      if (order!.priority !== "prioritised") tx.update(orderRef, { priority: "prioritised", prioritisedAt: now, updatedAt: now })
    }
    if (input.action === "chat_to_agent" || input.action === "start_assistant") {
      const messageId = messageKey(actor, input.requestId), messageRef = threadRef.collection("messages").doc(messageId)
      const requestRef = threadRef.collection("requests").doc(messageId)
      const [thread, previous] = await tx.getAll(threadRef, requestRef)
      if (previous.exists) {
        if (previous.data()?.action !== input.action) throw new HttpError(409, "This request was already used. Please try again")
        return { reply }
      }
      tx.create(requestRef, { action: input.action, createdAt: now })
      // Repeated clicks on an open chat reuse it without filling the inbox with notices.
      if (!thread.exists || thread.data()?.status === "closed" || (input.action === "chat_to_agent" && thread.data()?.mode === "assistant")) {
        const mode = input.action === "start_assistant" && assistantConfigured() ? "assistant" : "agent"
        tx.set(threadRef, {
          orderId, userId: order!.userId, userName: order!.userName || order!.shippingAddress?.name || "Customer", userEmail: order!.userEmail || order!.shippingAddress?.email || "",
          status: "open", lastMessage: reply, lastMessageId: messageId, lastMessageAt: now, updatedAt: now,
          mode, assistantTurns: 0, aiPendingMessageId: null, aiLeaseUntil: null,
          handoffReason: mode === "agent" ? (input.action === "chat_to_agent" ? "customer_requested" : "assistant_unavailable") : "",
          unreadByAdmin: mode === "agent", unreadByCustomer: false,
          ...(!thread.exists ? { createdAt: now } : {}),
        }, { merge: true })
        tx.create(messageRef, { text: reply, senderRole: "system", senderId: actor.uid, action: input.action, createdAt: now })
      }
    }
    return { reply }
  })
}
export async function sendSupportMessage(orderId: string, actor: SupportActor, input: z.infer<typeof supportMessageSchema>) {
  const db = getAdminDb(), orderRef = db.collection("orders").doc(orderId), threadRef = db.collection("supportThreads").doc(orderId)
  const messageId = messageKey(actor, input.requestId), messageRef = threadRef.collection("messages").doc(messageId)
  const attachmentIds = input.attachmentIds || []
  const result = await db.runTransaction(async tx => {
    const [order, thread, previous, ...photos] = await tx.getAll(orderRef, threadRef, messageRef, ...attachmentIds.map(id => threadRef.collection("photos").doc(id)))
    checkAccess(order.data() as StoreOrder | undefined, actor)
    if (!thread.exists) throw new HttpError(409, "Open Get support to start a conversation first")
    const senderRole = actor.admin ? "admin" : "customer"
    const now = Timestamp.now(), data = thread.data()!
    const pending = Boolean(data.aiPendingMessageId)
    const expired = pending && (data.aiLeaseUntil?.toMillis?.() || 0) <= now.toMillis()
    if (previous.exists) {
      if (previous.data()?.text !== input.message || previous.data()?.senderRole !== senderRole || JSON.stringify(previous.data()?.attachmentIds || []) !== JSON.stringify(attachmentIds)) throw new HttpError(409, "This message request was already used. Please try again")
      if (expired && data.mode === "assistant" && data.status === "open") {
        const fallbackRef = threadRef.collection("messages").doc(`${data.aiPendingMessageId}-assistant`)
        tx.set(fallbackRef, { text: "Our AI assistant is unavailable right now. " + handoffReply, senderRole: "system", senderId: "system", createdAt: now })
        tx.update(threadRef, { mode: "agent", handoffReason: "assistant_unavailable", aiPendingMessageId: null, aiLeaseUntil: null, lastMessage: handoffReply, lastMessageId: fallbackRef.id, lastMessageAt: now, updatedAt: now, unreadByAdmin: true, unreadByCustomer: true })
      }
      return { messageId, generate: false, order: null }
    }
    if (data.status !== "open") throw new HttpError(409, "This conversation is closed. Reopen the chat to send a message")
    if (!actor.admin && pending && !expired) throw new HttpError(409, "The assistant is replying. Please wait a moment before sending another message")
    const attachments = photos.map(photo => {
      if (!photo.exists || photo.data()?.uploaderId !== actor.uid) throw new HttpError(400, "One of these photos is unavailable. Please add it again")
      return photo.data()!.attachment as SupportAttachment
    })
    const assistantMode = !actor.admin && data.mode === "assistant"
    const reason = assistantMode ? (expired ? "assistant_unavailable" : requestedAgent(input.message) ? "customer_requested" : attachments.length ? "photo_review" : (data.assistantTurns || 0) >= MAX_ASSISTANT_TURNS ? "unresolved" : "") : ""
    const generate = assistantMode && !reason
    tx.create(messageRef, { text: input.message, attachmentIds, attachments, senderRole, senderId: actor.uid, createdAt: now })
    tx.update(threadRef, {
      lastMessage: input.message || `${attachments.length} photo${attachments.length === 1 ? "" : "s"}`, lastMessageId: messageId, lastMessageAt: now, updatedAt: now,
      [actor.admin ? "unreadByCustomer" : "unreadByAdmin"]: actor.admin || !generate,
      ...(actor.admin ? { mode: "agent", handoffReason: data.mode === "assistant" ? "admin_takeover" : data.handoffReason || "", aiPendingMessageId: null, aiLeaseUntil: null } : {}),
      ...(generate ? { assistantTurns: (data.assistantTurns || 0) + 1, aiPendingMessageId: messageId, aiLeaseUntil: Timestamp.fromMillis(now.toMillis() + 25_000) } : {}),
    })
    if (reason) {
      const noticeRef = threadRef.collection("messages").doc(`${messageId}-assistant`)
      const text = reason === "photo_review" ? "Thank you for the photo. The UCALL team will review it. " + handoffReply : handoffReply
      tx.create(noticeRef, { text, senderRole: "system", senderId: "system", createdAt: now })
      tx.update(threadRef, { mode: "agent", handoffReason: reason, aiPendingMessageId: null, aiLeaseUntil: null, lastMessage: text, lastMessageId: noticeRef.id, unreadByAdmin: true, unreadByCustomer: true })
    }
    return { messageId, generate, order: order.data() as StoreOrder }
  })
  if (result.generate && result.order) {
    const history = await threadRef.collection("messages").orderBy("createdAt", "desc").limit(10).get()
    const answer = await generateSupportReply(result.order, history.docs.reverse().map(doc => ({ text: doc.data().text || "[Photo attached for the team]", senderRole: doc.data().senderRole })))
    await db.runTransaction(async tx => {
      const thread = await tx.get(threadRef), data = thread.data()
      // A customer handoff, admin reply or closure always wins over an in-flight AI reply.
      if (data?.status !== "open" || data.mode !== "assistant" || data.aiPendingMessageId !== messageId) return
      const now = Timestamp.now(), replyRef = threadRef.collection("messages").doc(`${messageId}-assistant`)
      const text = answer.escalate && answer.reason !== "assistant_unavailable" ? `${answer.reply}\n\n${handoffReply}` : answer.reply
      tx.create(replyRef, { text, senderRole: answer.reason === "assistant_unavailable" ? "system" : "assistant", senderId: "assistant", createdAt: now })
      tx.update(threadRef, { mode: answer.escalate ? "agent" : "assistant", handoffReason: answer.reason, aiPendingMessageId: null, aiLeaseUntil: null, lastMessage: text, lastMessageId: replyRef.id, lastMessageAt: now, updatedAt: now, unreadByCustomer: true, unreadByAdmin: answer.escalate })
    })
  }
  return { messageId }
}
export async function markSupportRead(orderId: string, actor: SupportActor, lastMessageId: string) {
  const db = getAdminDb(), threadRef = db.collection("supportThreads").doc(orderId)
  await db.runTransaction(async tx => {
    const [order, thread] = await tx.getAll(db.collection("orders").doc(orderId), threadRef)
    checkAccess(order.data() as StoreOrder | undefined, actor)
    if (thread.exists && thread.data()?.lastMessageId === lastMessageId) tx.update(threadRef, { [actor.admin ? "unreadByAdmin" : "unreadByCustomer"]: false })
  })
}
export async function setSupportStatus(orderId: string, status: "open" | "closed") {
  const db = getAdminDb(), ref = db.collection("supportThreads").doc(orderId)
  await db.runTransaction(async tx => {
    const thread = await tx.get(ref)
    if (!thread.exists) throw new HttpError(404, "Conversation not found")
    if (thread.data()?.status === status && thread.data()?.mode !== "assistant") return
    const now = Timestamp.now(), messageRef = ref.collection("messages").doc()
    const text = status === "closed" ? "The UCALL team closed this conversation. You can choose Chat to agent again if you still need help." : "The UCALL team reopened this conversation."
    tx.create(messageRef, { text, senderRole: "system", senderId: "system", createdAt: now })
    tx.update(ref, { status, mode: "agent", aiPendingMessageId: null, aiLeaseUntil: null, updatedAt: now, lastMessage: text, lastMessageId: messageRef.id, lastMessageAt: now, unreadByCustomer: true })
  })
}

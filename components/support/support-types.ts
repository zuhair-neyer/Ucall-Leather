export interface SupportThread {
  id: string
  orderId: string
  userId: string
  userName: string
  userEmail: string
  status: "open" | "closed"
  mode?: "assistant" | "agent"
  assistantTurns?: number
  handoffReason?: string
  aiPendingMessageId?: string | null
  lastMessage: string
  lastMessageId: string
  lastMessageAt?: { seconds: number }
  createdAt?: { seconds: number }
  updatedAt?: { seconds: number }
  unreadByAdmin: boolean
  unreadByCustomer: boolean
}

export interface SupportMessage {
  id: string
  text: string
  senderRole: "customer" | "admin" | "system" | "assistant"
  senderId: string
  attachments?: SupportAttachment[]
  createdAt?: { seconds: number }
}

export interface SupportAttachment {
  id: string
  name: string
  contentType: string
  width: number
  height: number
  size: number
}

export function supportTime(timestamp?: { seconds: number }) {
  return timestamp ? new Date(timestamp.seconds * 1000).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  }) : "Just now"
}

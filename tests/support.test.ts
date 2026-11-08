import { before, beforeEach, after, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { deleteApp, getApps } from "firebase-admin/app"
import { getAdminDb } from "../lib/firebase-admin"
import { createCheckoutOrder, type CheckoutInput } from "../lib/server/orders"
import { markSupportRead, performSupportAction, sendSupportMessage, setSupportStatus, supportMessageSchema, supportReply } from "../lib/server/support"
import { getSupportPhoto, uploadSupportPhoto } from "../lib/server/support-photos"
import sharp from "sharp"
process.env.FIREBASE_PROJECT_ID = "demo-ucall"
const buyer = { uid: "alice", email: "alice@example.com" }, actor = { uid: "alice", admin: false }, admin = { uid: "owner", admin: true }
const input: CheckoutInput = { items: [{ id: "belt", quantity: 1 }], paymentMethod: "cod", address: { name: "Alice Customer", email: buyer.email, phone: "9335228107", address: "600 C Block", city: "Kanpur", state: "Uttar Pradesh", pincode: "208010" } }
let orderId: string
const action = (value: "faster_delivery" | "chat_to_agent" | "where_is_order") => ({ action: value, requestId: randomUUID() })
before(() => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Run through pnpm test:emulators") })
beforeEach(async () => {
  const db = getAdminDb()
  for (const name of ["products", "orders", "emailOutbox", "supportThreads"]) await db.recursiveDelete(db.collection(name))
  await db.collection("products").doc("belt").set({ name: "Belt", price: 1000, stock: 10, image: "/category-belts.webp" })
  orderId = (await createCheckoutOrder(buyer, input, randomUUID())).id
})
after(async () => { await Promise.all(getApps().map(deleteApp)) })
test("priority is owner scoped, idempotent, persisted and disallowed on complete orders", async () => {
  await assert.rejects(performSupportAction(orderId, { uid: "bob", admin: false }, action("faster_delivery")), /not found/)
  const result = await performSupportAction(orderId, actor, action("faster_delivery"))
  assert.match(result.reply, /Order prioritised/)
  const ref = getAdminDb().collection("orders").doc(orderId), initial = (await ref.get()).data()!
  await performSupportAction(orderId, actor, action("faster_delivery"))
  assert.equal((await ref.get()).data()!.prioritisedAt.toMillis(), initial.prioritisedAt.toMillis())
  assert.equal(initial.priority, "prioritised")
  assert.equal((await getAdminDb().collection("supportThreads").get()).size, 0)
  for (const status of ["delivered", "cancelled"]) {
    await ref.update({ status })
    await assert.rejects(performSupportAction(orderId, actor, action("faster_delivery")), /already complete/)
  }
})
test("chat must be requested first, customer and admin exchange messages and retries do not duplicate", async () => {
  const message = { message: "Where is my parcel?", requestId: randomUUID() }
  await assert.rejects(sendSupportMessage(orderId, admin, message), /start a conversation/)
  const start = action("chat_to_agent")
  await Promise.all([performSupportAction(orderId, actor, start), performSupportAction(orderId, actor, start)])
  const ref = getAdminDb().collection("supportThreads").doc(orderId)
  assert.equal((await ref.collection("messages").get()).size, 1)
  await assert.rejects(sendSupportMessage(orderId, { uid: "bob", admin: false }, message), /not found/)
  await Promise.all([sendSupportMessage(orderId, actor, message), sendSupportMessage(orderId, actor, message)])
  await assert.rejects(sendSupportMessage(orderId, actor, { ...message, message: "Changed text" }), /already used/)
  await sendSupportMessage(orderId, admin, { message: "We are checking with the courier.", requestId: randomUUID() })
  assert.equal((await ref.collection("messages").get()).size, 3)
  const thread = (await ref.get()).data()!
  assert.equal(thread.userId, buyer.uid)
  assert.equal(thread.unreadByCustomer, true)
  await markSupportRead(orderId, actor, "old-message-id")
  assert.equal((await ref.get()).data()!.unreadByCustomer, true)
  await markSupportRead(orderId, actor, thread.lastMessageId)
  assert.equal((await ref.get()).data()!.unreadByCustomer, false)
})
test("closed chat can reopen without losing history and old retries cannot reopen it", async () => {
  const start = action("chat_to_agent")
  await performSupportAction(orderId, actor, start)
  const whileOpen = action("chat_to_agent")
  await performSupportAction(orderId, actor, whileOpen)
  await setSupportStatus(orderId, "closed")
  const ref = getAdminDb().collection("supportThreads").doc(orderId)
  await performSupportAction(orderId, actor, start)
  await performSupportAction(orderId, actor, whileOpen)
  assert.equal((await ref.get()).data()!.status, "closed")
  await assert.rejects(sendSupportMessage(orderId, actor, { message: "Help", requestId: randomUUID() }), /closed/)
  await performSupportAction(orderId, actor, action("chat_to_agent"))
  assert.equal((await ref.get()).data()!.status, "open")
  assert.equal((await ref.collection("messages").get()).size, 3)
})
test("self-service answers use current order state and do not pretend failed payments were received", async () => {
  await getAdminDb().collection("orders").doc(orderId).update({ status: "shipped", tracking: { carrier: "Test Courier", number: "TRACK123", url: "https://example.com" } })
  assert.match((await performSupportAction(orderId, actor, action("where_is_order"))).reply, /TRACK123/)
  const order = (await getAdminDb().collection("orders").doc(orderId).get()).data()!
  assert.match(supportReply({ ...order, paymentMethod: "razorpay", paymentStatus: "failed" } as Parameters<typeof supportReply>[0], "where_is_order"), /awaiting a confirmed payment/)
  for (const message of ["", " ", "a".repeat(2001)]) assert.equal(supportMessageSchema.safeParse({ message, requestId: randomUUID() }).success, false)
  assert.equal(supportMessageSchema.safeParse({ message: "hello", requestId: randomUUID(), senderRole: "admin" }).success, false)
})

test("photos belong to one conversation and sender, and can be sent without text", async () => {
  await performSupportAction(orderId, actor, action("chat_to_agent"))
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer()
  const { attachment } = await uploadSupportPhoto(orderId, actor, png, "image/png", "belt.png")
  assert.equal(attachment.contentType, "image/jpeg")
  assert.equal((await uploadSupportPhoto(orderId, actor, png, "image/png", "belt.png")).attachment.id, attachment.id)
  const ref = getAdminDb().collection("supportThreads").doc(orderId)
  assert.equal((await ref.collection("photos").get()).size, 1)
  assert.equal((await getSupportPhoto(orderId, admin, attachment.id)).attachment.id, attachment.id)
  await assert.rejects(getSupportPhoto(orderId, { uid: "bob", admin: false }, attachment.id), /not found/)
  await assert.rejects(uploadSupportPhoto(orderId, { uid: "bob", admin: false }, png, "image/png", "belt.png"), /not found/)
  await assert.rejects(sendSupportMessage(orderId, admin, { message: "", attachmentIds: [attachment.id], requestId: randomUUID() }), /unavailable/)
  const message = supportMessageSchema.parse({ message: "", attachmentIds: [attachment.id], requestId: randomUUID() })
  await Promise.all([sendSupportMessage(orderId, actor, message), sendSupportMessage(orderId, actor, message)])
  assert.equal((await ref.collection("messages").get()).size, 2)
  const { attachment: adminPhoto } = await uploadSupportPhoto(orderId, admin, png, "image/png", "response.png")
  assert.notEqual(adminPhoto.id, attachment.id)
  await sendSupportMessage(orderId, admin, { message: "Here is the replacement option", attachmentIds: [adminPhoto.id], requestId: randomUUID() })
  assert.equal((await getSupportPhoto(orderId, actor, adminPhoto.id)).attachment.id, adminPhoto.id)
  await setSupportStatus(orderId, "closed")
  await assert.rejects(uploadSupportPhoto(orderId, actor, png, "image/png", "belt.png"), /reopen/)
})

test("missing AI configuration hands a new conversation to the agent", async () => {
  const key = process.env.GROQ_API_KEY
  delete process.env.GROQ_API_KEY
  try {
    await performSupportAction(orderId, actor, { action: "start_assistant", requestId: randomUUID() })
    const thread = (await getAdminDb().collection("supportThreads").doc(orderId).get()).data()!
    assert.equal(thread.mode, "agent")
    assert.equal(thread.handoffReason, "assistant_unavailable")
    assert.equal(thread.unreadByAdmin, true)
  } finally { if (key !== undefined) process.env.GROQ_API_KEY = key }
})

test("AI replies are idempotent, bounded, and unresolved requests transfer with history", async () => {
  const fetch = global.fetch, key = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = "test-only-placeholder"
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ intent: "order_status" }) } }] }) }
  try {
    const start = action("chat_to_agent")
    await Promise.all([performSupportAction(orderId, actor, start), performSupportAction(orderId, actor, start)])
    const input = { message: "Where is it?", requestId: randomUUID() }
    await Promise.all([sendSupportMessage(orderId, actor, input), sendSupportMessage(orderId, actor, input)])
    assert.equal(calls, 1)
    const ref = getAdminDb().collection("supportThreads").doc(orderId)
    assert.equal((await ref.collection("messages").get()).size, 3)
    assert.equal((await ref.get()).data()!.mode, "assistant")
    await performSupportAction(orderId, actor, action("chat_to_agent"))
    assert.equal((await ref.get()).data()!.mode, "assistant")
    assert.equal((await ref.get()).data()!.assistantTurns, 1)
    assert.equal((await ref.collection("messages").get()).size, 3)
    await sendSupportMessage(orderId, actor, { message: "This is not resolved", requestId: randomUUID() })
    assert.equal(calls, 1)
    assert.equal((await ref.get()).data()!.mode, "agent")
    assert.equal((await ref.get()).data()!.handoffReason, "customer_requested")
    assert.equal((await ref.collection("messages").get()).size, 5)
    assert.equal((await ref.get()).data()!.unreadByAdmin, true)
    await sendSupportMessage(orderId, actor, { message: "Any update?", requestId: randomUUID() })
    await sendSupportMessage(orderId, admin, { message: "I’m arranging dispatch now.", requestId: randomUUID() })
    const continuing = await performSupportAction(orderId, actor, action("chat_to_agent"))
    assert.match(continuing.reply, /already with the UCALL team/)
    assert.equal((await ref.get()).data()!.mode, "agent")
    assert.equal((await ref.get()).data()!.unreadByCustomer, true)
    assert.equal(calls, 1, "AI stays silent after handoff and admin reply")
  } finally { global.fetch = fetch; if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key }
})

test("explicit human transfer stops an in-flight AI reply and reopening a closed chat starts with AI", async () => {
  const fetch = global.fetch, key = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = "test-only-placeholder"
  let finish!: (value: Response) => void, started!: () => void
  const pending = new Promise<void>(resolve => { started = resolve })
  global.fetch = () => { started(); return new Promise<Response>(resolve => { finish = resolve }) }
  try {
    await performSupportAction(orderId, actor, action("chat_to_agent"))
    const sending = sendSupportMessage(orderId, actor, { message: "Where is it?", requestId: randomUUID() })
    await pending
    await performSupportAction(orderId, actor, { action: "request_agent", requestId: randomUUID() })
    finish(Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ intent: "order_status" }) } }] }))
    await sending
    const ref = getAdminDb().collection("supportThreads").doc(orderId)
    assert.equal((await ref.get()).data()!.mode, "agent")
    assert.equal((await ref.get()).data()!.handoffReason, "customer_requested")
    assert.equal((await ref.get()).data()!.unreadByAdmin, true)
    assert.equal((await ref.collection("messages").get()).docs.some(doc => doc.data().senderRole === "assistant"), false)
    await setSupportStatus(orderId, "closed")
    await performSupportAction(orderId, actor, action("chat_to_agent"))
    assert.equal((await ref.get()).data()!.mode, "assistant")
    assert.equal((await ref.get()).data()!.assistantTurns, 0)
    assert.equal((await ref.get()).data()!.unreadByAdmin, false)
    assert.equal((await ref.get()).data()!.aiPendingMessageId, null)
    assert.ok((await ref.collection("messages").get()).size > 3, "Reopening preserves the conversation history")
  } finally { global.fetch = fetch; if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key }
})

test("a human takeover prevents an in-flight AI answer from appearing", async () => {
  const fetch = global.fetch, key = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = "test-only-placeholder"
  let finish!: (value: Response) => void, started!: () => void
  const pending = new Promise<void>(resolve => { started = resolve })
  global.fetch = () => { started(); return new Promise<Response>(resolve => { finish = resolve }) }
  try {
    await performSupportAction(orderId, actor, { action: "start_assistant", requestId: randomUUID() })
    const sending = sendSupportMessage(orderId, actor, { message: "Where is it?", requestId: randomUUID() })
    await pending
    await sendSupportMessage(orderId, admin, { message: "I’m checking your parcel now.", requestId: randomUUID() })
    finish(Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ intent: "order_status" }) } }] }))
    await sending
    const ref = getAdminDb().collection("supportThreads").doc(orderId)
    assert.equal((await ref.get()).data()!.mode, "agent")
    assert.equal((await ref.collection("messages").get()).docs.some(doc => doc.data().senderRole === "assistant"), false)
  } finally { global.fetch = fetch; if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key }
})

test("AI makes at most three attempts before handing further questions to an agent", async () => {
  const fetch = global.fetch, key = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = "test-only-placeholder"
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ intent: "order_status" }) } }] }) }
  try {
    await performSupportAction(orderId, actor, { action: "start_assistant", requestId: randomUUID() })
    for (let index = 0; index < 4; index++) await sendSupportMessage(orderId, actor, { message: `Please check update ${index}`, requestId: randomUUID() })
    assert.equal(calls, 3)
    const ref = getAdminDb().collection("supportThreads").doc(orderId)
    assert.equal((await ref.get()).data()!.mode, "agent")
    assert.equal((await ref.get()).data()!.handoffReason, "unresolved")
  } finally { global.fetch = fetch; if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key }
})

test("photos in AI chat transfer privately to an agent without sending image data to a provider", async () => {
  const fetch = global.fetch, key = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = "test-only-placeholder"
  global.fetch = async () => { throw new Error("Photos must not be sent to the AI provider") }
  try {
    await performSupportAction(orderId, actor, { action: "start_assistant", requestId: randomUUID() })
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "blue" } }).png().toBuffer()
    const { attachment } = await uploadSupportPhoto(orderId, actor, png, "image/png", "damage.png")
    await sendSupportMessage(orderId, actor, { message: "", attachmentIds: [attachment.id], requestId: randomUUID() })
    const thread = (await getAdminDb().collection("supportThreads").doc(orderId).get()).data()!
    assert.equal(thread.mode, "agent")
    assert.equal(thread.handoffReason, "photo_review")
    assert.equal(thread.unreadByAdmin, true)
  } finally { global.fetch = fetch; if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key }
})

test("a stale interrupted AI request recovers on retry without duplicating the customer message", async () => {
  await performSupportAction(orderId, actor, action("chat_to_agent"))
  const input = { message: "Where is it?", requestId: randomUUID() }
  const sent = await sendSupportMessage(orderId, actor, input)
  const ref = getAdminDb().collection("supportThreads").doc(orderId)
  await ref.update({ mode: "assistant", aiPendingMessageId: sent.messageId, aiLeaseUntil: null })
  await sendSupportMessage(orderId, actor, input)
  const thread = (await ref.get()).data()!
  assert.equal(thread.mode, "agent")
  assert.equal(thread.aiPendingMessageId, null)
  assert.equal(thread.handoffReason, "assistant_unavailable")
  assert.equal((await ref.collection("messages").get()).size, 3)
})


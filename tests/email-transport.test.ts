import { test } from "node:test"
import assert from "node:assert/strict"
import type { SendMailOptions } from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { createTransactionalEmailSender, TRANSACTIONAL_EMAIL_ADDRESS } from "../lib/server/email-transport"

const message = { to: "customer@example.com", subject: "UCALL: order shipped", text: "Your order was shipped. Tracking: TRACK123.", idempotencyKey: "order-shipped-customer" }
const gmailEnv = { SMTP_USER: TRANSACTIONAL_EMAIL_ADDRESS, SMTP_PASS: "test app pass word" }

test("Gmail authenticates and sends from the fixed mailbox over verified TLS", async () => {
  let options: SMTPTransport.Options | undefined
  let sent: SendMailOptions | undefined
  let closed = false
  const send = createTransactionalEmailSender({ env: { ...gmailEnv, EMAIL_FROM: "spoof@example.com" }, createSmtpTransport: config => {
    options = config
    return { sendMail: async input => { sent = input; return { accepted: [message.to], rejected: [] } }, close: () => { closed = true } }
  } })
  await send(message)
  assert.equal(options?.host, "smtp.gmail.com")
  assert.equal(options?.port, 465)
  assert.equal(options?.secure, true)
  assert.equal(options?.tls?.rejectUnauthorized, true)
  assert.equal(options?.tls?.minVersion, "TLSv1.2")
  assert.deepEqual(options?.auth, { user: TRANSACTIONAL_EMAIL_ADDRESS, pass: "testapppassword" })
  assert.deepEqual(sent?.from, { name: "UCALL Leather Co.", address: TRANSACTIONAL_EMAIL_ADDRESS })
  assert.equal(sent?.replyTo, TRANSACTIONAL_EMAIL_ADDRESS)
  assert.equal(sent?.to, message.to)
  assert.equal(sent?.text, message.text)
  assert.equal(sent?.disableFileAccess, true)
  assert.equal(sent?.disableUrlAccess, true)
  assert.equal(closed, true)
  assert.ok((options?.connectionTimeout ?? 0) <= 15_000)
  assert.ok((options?.socketTimeout ?? 0) <= 20_000)
})

test("port 587 requires STARTTLS and blank username uses the UCALL mailbox", async () => {
  let options: SMTPTransport.Options | undefined
  const send = createTransactionalEmailSender({ env: { SMTP_PASS: "fake-password", SMTP_PORT: "587" }, createSmtpTransport: config => {
    options = config
    return { sendMail: async () => ({ accepted: [message.to], rejected: [] }) }
  } })
  await send(message)
  assert.equal(options?.port, 587)
  assert.equal(options?.secure, false)
  assert.equal(options?.requireTLS, true)
})

test("SMTP retries retain a stable Message-ID per event and recipient", async () => {
  const ids: unknown[] = []
  const send = createTransactionalEmailSender({ env: gmailEnv, createSmtpTransport: () => ({ sendMail: async input => {
    ids.push(input.messageId)
    return { accepted: [String(input.to)], rejected: [] }
  } }) })
  await send(message)
  await send(message)
  await send({ ...message, to: TRANSACTIONAL_EMAIL_ADDRESS })
  await send({ ...message, idempotencyKey: "order-delivered-customer" })
  assert.equal(ids[0], ids[1])
  assert.notEqual(ids[0], ids[2])
  assert.notEqual(ids[0], ids[3])
  assert.match(String(ids[0]), /^<ucall-[a-f0-9]{64}@gmail\.com>$/)
})

test("SMTP must accept the intended recipient before success is returned", async () => {
  for (const reply of [
    { accepted: [], rejected: [message.to] },
    { accepted: ["someone-else@example.com"], rejected: [] },
    { accepted: [message.to], rejected: [message.to] },
  ]) {
    const send = createTransactionalEmailSender({ env: gmailEnv, createSmtpTransport: () => ({ sendMail: async () => reply }) })
    await assert.rejects(send(message), /did not accept/)
  }
})

test("SMTP errors propagate without switching providers or leaking credentials", async () => {
  let resendCalled = false
  let closed = false
  const send = createTransactionalEmailSender({ env: { ...gmailEnv, RESEND_API_KEY: "test-key", EMAIL_FROM: "orders@example.com" },
    createSmtpTransport: () => ({ sendMail: async () => { throw new Error("SMTP unavailable") }, close: () => { closed = true } }),
    createResendClient: () => { resendCalled = true; return { send: async () => ({ data: { id: "no-fallback" } }) } },
  })
  await assert.rejects(send(message), /SMTP unavailable/)
  assert.equal(resendCalled, false)
  assert.equal(closed, true)
})

test("missing credentials, other SMTP accounts and unsafe ports fail before a connection", async () => {
  for (const env of [{}, { ...gmailEnv, SMTP_USER: "different@gmail.com" }, { ...gmailEnv, SMTP_PORT: "25" }, { ...gmailEnv, SMTP_PORT: "587abc" }]) {
    let connected = false
    const send = createTransactionalEmailSender({ env, createSmtpTransport: () => { connected = true; return { sendMail: async () => ({ accepted: [message.to], rejected: [] }) } } })
    await assert.rejects(send(message))
    assert.equal(connected, false)
  }
})

test("verified-domain Resend remains supported with provider idempotency", async () => {
  let captured: unknown
  const send = createTransactionalEmailSender({ env: { RESEND_API_KEY: "fake-api-key", EMAIL_FROM: "Orders <orders@example.com>" }, createResendClient: () => ({ send: async (input, options) => {
    captured = { input, options }
    return { data: { id: "accepted-id" } }
  } }) })
  await send(message)
  assert.deepEqual(captured, { input: { from: "UCALL Leather Co. <orders@example.com>", to: message.to, replyTo: TRANSACTIONAL_EMAIL_ADDRESS, subject: message.subject, text: message.text }, options: { idempotencyKey: message.idempotencyKey } })
})

test("Resend cannot spoof Gmail or report an unaccepted request as sent", async () => {
  for (const from of [TRANSACTIONAL_EMAIL_ADDRESS, `UCALL <${TRANSACTIONAL_EMAIL_ADDRESS}>`, "ucall@googlemail.com"]) {
    let providerCalled = false
    const send = createTransactionalEmailSender({ env: { RESEND_API_KEY: "test", EMAIL_FROM: from }, createResendClient: () => {
      providerCalled = true
      return { send: async () => ({ data: { id: "never" } }) }
    } })
    await assert.rejects(send(message), /Gmail senders/)
    assert.equal(providerCalled, false)
  }
  for (const reply of [{ error: { message: "Denied" } }, { data: null }, {}]) {
    const send = createTransactionalEmailSender({ env: { RESEND_API_KEY: "test", EMAIL_FROM: "orders@example.com" }, createResendClient: () => ({ send: async () => reply }) })
    await assert.rejects(send(message), /did not accept/)
  }
})

test("invalid recipient or header content is rejected before connecting", async () => {
  let connected = false
  const send = createTransactionalEmailSender({ env: gmailEnv, createSmtpTransport: () => { connected = true; return { sendMail: async () => ({ accepted: [], rejected: [] }) } } })
  await assert.rejects(send({ ...message, to: "customer@example.com\r\nBcc: other@example.com" }))
  await assert.rejects(send({ ...message, subject: "Shipped\r\nBcc: other@example.com" }))
  assert.equal(connected, false)
})

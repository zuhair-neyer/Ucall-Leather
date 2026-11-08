import "server-only"
import { createHash } from "node:crypto"
import nodemailer, { type SendMailOptions } from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { Resend } from "resend"
import { z } from "zod"
import { STORE_NAME } from "../config"

export const TRANSACTIONAL_EMAIL_ADDRESS = "ucallleather.india@gmail.com"

export interface TransactionalEmail {
  to: string
  subject: string
  text: string
  idempotencyKey: string
}

interface SmtpSender {
  sendMail: (message: SendMailOptions) => Promise<Pick<SMTPTransport.SentMessageInfo, "accepted" | "rejected">>
  close?: () => void
}
interface ResendSender {
  send: (message: { from: string; to: string; replyTo: string; subject: string; text: string }, options: { idempotencyKey: string }) => Promise<{ data?: { id?: string } | null; error?: unknown }>
}
interface EmailDependencies {
  env?: Readonly<Record<string, string | undefined>>
  createSmtpTransport?: (options: SMTPTransport.Options) => SmtpSender
  createResendClient?: (apiKey: string) => ResendSender
}

const emailAddress = z.email().max(254)
const checkedEmail = (value: string) => {
  const result = emailAddress.safeParse(value.trim())
  if (!result.success) throw new Error("Email address is invalid")
  return result.data
}

function resendAddress(value: string | undefined) {
  const from = value?.trim() || ""
  const match = /^[^<>\r\n]*<([^<>\r\n]+)>$/.exec(from)
  const address = checkedEmail(match?.[1] || from)
  if (/@(?:gmail|googlemail)\.com$/i.test(address)) throw new Error("Gmail senders require Gmail SMTP; Resend requires a verified domain")
  return address
}

/** SMTP has no idempotency API. A stable Message-ID helps mail clients identify retries;
 * the durable outbox must still track per-recipient success and can rarely duplicate mail
 * if the process stops between SMTP acceptance and saving that success. */
export function createTransactionalEmailSender(dependencies: EmailDependencies = {}) {
  const env = dependencies.env ?? process.env
  const createSmtp = dependencies.createSmtpTransport ?? (options => nodemailer.createTransport(options))
  const createResend = dependencies.createResendClient ?? (apiKey => new Resend(apiKey).emails)

  return async function send(input: TransactionalEmail): Promise<void> {
    const to = checkedEmail(input.to)
    if (!input.subject.trim() || /[\r\n]/.test(input.subject) || !input.text || !input.idempotencyKey.trim()) throw new Error("Email content is invalid")
    // Google displays app passwords in spaced groups; whitespace is not part of the credential.
    const password = env.SMTP_PASS?.replace(/\s/g, "")
    if (password) {
      const user = (env.SMTP_USER?.trim() || TRANSACTIONAL_EMAIL_ADDRESS).toLowerCase()
      if (user !== TRANSACTIONAL_EMAIL_ADDRESS) throw new Error(`Gmail SMTP must authenticate as ${TRANSACTIONAL_EMAIL_ADDRESS}`)
      const port = Number(env.SMTP_PORT?.trim() || "465")
      if (port !== 465 && port !== 587) throw new Error("Gmail SMTP port must be 465 or 587")
      const transport = createSmtp({
        host: "smtp.gmail.com", port, secure: port === 465, requireTLS: port === 587,
        auth: { user: TRANSACTIONAL_EMAIL_ADDRESS, pass: password },
        tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
        connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 20_000, dnsTimeout: 10_000,
        logger: false, debug: false,
      })
      const digest = createHash("sha256").update(`${input.idempotencyKey}:${to.toLowerCase()}`).digest("hex")
      try {
        const result = await transport.sendMail({
          from: { name: STORE_NAME, address: TRANSACTIONAL_EMAIL_ADDRESS }, to,
          replyTo: TRANSACTIONAL_EMAIL_ADDRESS, subject: input.subject, text: input.text,
          messageId: `<ucall-${digest}@gmail.com>`, disableFileAccess: true, disableUrlAccess: true,
        })
        const matchesRecipient = (address: string | { address: string }) => (typeof address === "string" ? address : address.address).toLowerCase() === to.toLowerCase()
        if (!result.accepted.some(matchesRecipient) || result.rejected.some(matchesRecipient)) throw new Error("Gmail SMTP did not accept the recipient")
      } finally { transport.close?.() }
      return
    }

    // Retain an explicitly configured verified-domain provider. Never fail over after
    // an SMTP attempt: it may already have accepted the message before a network error.
    if (env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()) {
      const from = resendAddress(env.EMAIL_FROM)
      const result = await createResend(env.RESEND_API_KEY.trim()).send({
        from: `${STORE_NAME} <${from}>`, to, replyTo: TRANSACTIONAL_EMAIL_ADDRESS,
        subject: input.subject, text: input.text,
      }, { idempotencyKey: input.idempotencyKey })
      if (result.error || !result.data?.id) throw new Error("Email provider did not accept the message")
      return
    }
    throw new Error("Gmail SMTP app password is missing")
  }
}

export const sendTransactionalEmail = createTransactionalEmailSender()

"use client"

import Link from "next/link"
import { useState } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import emailjs from "@emailjs/browser"
import { toast } from "sonner"
import { db, firebaseConfigured } from "@/lib/firebase"
import { contactSchema } from "@/lib/validation"
import { CONTACT } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ContactInput = z.infer<typeof contactSchema>

export function ContactForm() {
  const [status, setStatus] = useState<{ saved: boolean; message: string } | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", subject: "", message: "" } })

  async function submit(values: ContactInput) {
    setStatus(null)
    if (!firebaseConfigured) { setStatus({ saved: false, message: `The contact form is unavailable. Please email ${CONTACT.email}.` }); return }
    try {
      // Only acknowledge receipt after Firestore confirms the write. Email is a separate notification.
      await addDoc(collection(db, "contacts"), { ...values, read: false, createdAt: serverTimestamp() })
    } catch {
      setStatus({ saved: false, message: "Your message was not saved. Your text is still here; please retry or contact us by email." })
      toast.error("Could not save your message")
      return
    }
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
    if (!serviceId || !templateId || !publicKey) {
      setStatus({ saved: true, message: "Your message has been saved for our team. Email notification is unavailable, but you do not need to send it again." })
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        emailjs.send(serviceId, templateId, { from_name: values.name, from_email: values.email, subject: values.subject, message: values.message, reply_to: values.email }, { publicKey }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Email notification timed out")), 15000) }),
      ])
      setStatus({ saved: true, message: "Message received and our team notified. Thank you for getting in touch." })
      toast.success("Message received")
    } catch {
      setStatus({ saved: true, message: "Your message is saved. The email notification could not be confirmed, but our team can read your message. Please do not resend it." })
    } finally { if (timer) clearTimeout(timer) }
  }

  return <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
    <h2 className="font-serif text-2xl text-primary">Send a message</h2>
    <fieldset disabled={isSubmitting || status?.saved} className="space-y-5 disabled:opacity-75">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="c-name">Name</Label><Input id="c-name" {...register("name")} autoComplete="name" className="mt-1" maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "c-name-error" : undefined} />{errors.name && <p id="c-name-error" className="mt-1 text-sm text-destructive">{errors.name.message}</p>}</div>
        <div><Label htmlFor="c-email">Email</Label><Input id="c-email" type="email" {...register("email")} autoComplete="email" className="mt-1" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "c-email-error" : undefined} />{errors.email && <p id="c-email-error" className="mt-1 text-sm text-destructive">{errors.email.message}</p>}</div>
      </div>
      <div><Label htmlFor="c-subject">Subject</Label><Input id="c-subject" {...register("subject")} className="mt-1" maxLength={200} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "c-subject-error" : undefined} />{errors.subject && <p id="c-subject-error" className="mt-1 text-sm text-destructive">{errors.subject.message}</p>}</div>
      <div><Label htmlFor="c-message">Message</Label><Textarea id="c-message" {...register("message")} rows={5} className="mt-1" maxLength={5000} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "c-message-error" : undefined} />{errors.message && <p id="c-message-error" className="mt-1 text-sm text-destructive">{errors.message.message}</p>}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">We use these details to respond to your enquiry. Please do not include payment card numbers or passwords. Read our <Link href="/privacy-policy" className="underline">privacy policy</Link>.</p>
      <Button type="submit" className="min-h-11 w-full">{isSubmitting ? "Saving and sending…" : status?.saved ? "Message received" : "Send message"}</Button>
    </fieldset>
    {status && <p role="status" aria-live="polite" className={`rounded-md border px-4 py-3 text-sm ${status.saved ? "border-border bg-secondary text-secondary-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{status.message}</p>}
    {status?.saved && <Button type="button" variant="outline" className="min-h-11" onClick={() => { reset(); setStatus(null) }}>Write another message</Button>}
  </form>
}

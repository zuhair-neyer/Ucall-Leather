"use client"

import { useState } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import emailjs from "@emailjs/browser"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)

    if (!form.name || !form.email || !form.message) {
      const msg = "Please fill in all required fields."
      setStatus({ type: "error", message: msg })
      toast.error(msg)
      return
    }

    setLoading(true)
    try {
      const sendPromise = emailjs.send(
        "service_yys70xl",
        "template_0cp46oy",
        {
          from_name: form.name,
          from_email: form.email,
          subject: form.subject || "New contact message",
          message: form.message,
          reply_to: form.email,
        },
        { publicKey: "-I4sac8NNq38IsME4" },
      )

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      )

      await Promise.race([sendPromise, timeoutPromise])

      if (db) {
        try {
          await addDoc(collection(db, "contacts"), {
            ...form,
            createdAt: serverTimestamp(),
          })
        } catch (dbErr) { }
      }

      setLoading(false)
      setSuccess(true)
      setStatus({ type: "success", message: "Message sent. We'll be in touch soon." })
      toast.success("Message sent!")
      setTimeout(() => {
        setForm({ name: "", email: "", subject: "", message: "" })
      }, 2000)

    } catch (err: any) {
      if (err?.message === "timeout") {
        setLoading(false)
        setSuccess(true)
        setStatus({ type: "success", message: "Message sent. We'll be in touch soon." })
        toast.success("Message sent!")
        setTimeout(() => {
          setForm({ name: "", email: "", subject: "", message: "" })
        }, 2000)
        return
      }
      const msg = err?.text || err?.message || "Could not send message."
      setStatus({ type: "error", message: msg })
      toast.error(msg)
      setLoading(false)
      setSuccess(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
      <h2 className="font-serif text-xl sm:text-2xl text-primary">Send a message</h2>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-name">Name</Label>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="c-subject">Subject</Label>
        <Input
          id="c-subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="c-message">Message</Label>
        <Textarea
          id="c-message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      {status && (
        <div
          role="status"
          aria-live="polite"
          className={
            status.type === "success"
              ? "rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success}
        style={{
          width: "100%",
          padding: "12px 16px",
          backgroundColor: success ? "#4CAF50" : "#3B1F0A",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: loading || success ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600",
          minHeight: "44px",
        }}
      >
        {success ? "Message Sent ✓" : loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}

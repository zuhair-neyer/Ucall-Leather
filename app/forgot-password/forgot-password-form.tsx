"use client"
import Link from "next/link"
import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { z } from "zod"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/context/auth-context"
import { getFriendlyAuthError } from "@/lib/auth-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JourneyAuthShell } from "@/components/site/journey-auth-shell"

export function ForgotPasswordForm() {
  const { isConfigured } = useAuth()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    const result = z.string().trim().email().max(254).safeParse(email)
    if (!result.success) { setError("Enter a valid email address."); return }
    if (!isConfigured) { setError("Password reset is temporarily unavailable. Please try again later."); return }
    setBusy(true)
    try { await sendPasswordResetEmail(auth, result.data); setSent(true) }
    catch (failure) {
      const code = failure && typeof failure === "object" && "code" in failure ? failure.code : ""
      if (code === "auth/user-not-found") setSent(true)
      else setError(getFriendlyAuthError(failure))
    } finally { setBusy(false) }
  }
  return <JourneyAuthShell title="Reset your password" eyebrow="A FRESH START" description="Enter the email address you used to create your account.">{sent ? <p role="status" className="mt-6 rounded-md bg-secondary p-4 text-sm">If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.</p> : <form onSubmit={submit} className="mt-6 space-y-4" noValidate><div><Label htmlFor="reset-email">Email</Label><Input id="reset-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} className="mt-1 min-h-11" /></div>{error && <p id="reset-error" role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="min-h-11 w-full">{busy ? "Sending…" : "Send reset link"}</Button></form>}<Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-sm text-accent underline">Back to sign in</Link></JourneyAuthShell>
}

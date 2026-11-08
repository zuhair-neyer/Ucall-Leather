"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { confirmPasswordReset, validatePassword, verifyPasswordResetCode } from "firebase/auth"
import { CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { auth, firebaseConfigured } from "@/lib/firebase"
import { SITE_URL } from "@/lib/config"
import { passwordPolicyError, passwordResetError, readPasswordResetLink, validateResetPassword } from "@/lib/password-reset"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetLinks() {
  return <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
    <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-accent underline">Request a new reset link</Link>
    <Link href="/login" className="inline-flex min-h-11 items-center underline">Back to sign in</Link>
  </div>
}

function HostedAction({ url }: { url: string }) {
  useEffect(() => { window.location.replace(url) }, [url])
  return <div className="mt-6 space-y-4 text-sm"><p role="status">Opening your secure account link…</p><a href={url} rel="noreferrer" className="text-accent underline">Continue securely</a></div>
}

export function ResetPasswordForm() {
  const params = useSearchParams()
  if (!firebaseConfigured) return <div className="mt-6"><p role="alert" className="text-sm text-destructive">Password reset is temporarily unavailable. Please try again later.</p><ResetLinks /></div>
  // Query-string apiKey and continueUrl can never select another Firebase app or a redirect destination.
  const link = readPasswordResetLink(params, { ...auth.app.options, siteUrl: SITE_URL })
  if (link.kind === "invalid") return <div className="mt-6"><p role="alert" className="text-sm text-destructive">This reset link is missing or invalid. Open the complete link from your email, or request a new one.</p><ResetLinks /></div>
  if (link.kind === "hosted") return <HostedAction url={link.url} />
  // A different code starts a fresh form, including fresh verification and empty passwords.
  return <VerifiedResetForm key={link.code} code={link.code} />
}

function VerifiedResetForm({ code }: { code: string }) {
  const [state, setState] = useState<"checking" | "ready" | "error" | "invalid" | "success">("checking")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const passwordInput = useRef<HTMLInputElement>(null)
  const confirmationInput = useRef<HTMLInputElement>(null)
  const active = useRef(false)
  const submitting = useRef(false)

  useEffect(() => {
    active.current = true
    let current = true
    verifyPasswordResetCode(auth, code).then(address => {
      if (!current) return
      setEmail(address)
      setState("ready")
    }).catch(failure => {
      if (!current) return
      const result = passwordResetError(failure)
      setError(result.message)
      setState(result.invalidLink ? "invalid" : "error")
    })
    return () => { current = false; active.current = false }
  }, [code, attempt])

  useEffect(() => {
    if (busy) return
    if (errors.password) passwordInput.current?.focus()
    else if (errors.confirmation) confirmationInput.current?.focus()
  }, [busy, errors])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || state !== "ready") return
    setError("")
    const validation = validateResetPassword(password, confirmation)
    setErrors(validation)
    if (validation.password || validation.confirmation) {
      return
    }
    submitting.current = true
    setBusy(true)
    try {
      const policyError = passwordPolicyError(await validatePassword(auth, password))
      if (!active.current) return
      if (policyError) {
        setErrors({ password: policyError })
        return
      }
      await confirmPasswordReset(auth, code, password)
      if (!active.current) return
      setPassword("")
      setConfirmation("")
      setShowPassword(false)
      setShowConfirmation(false)
      setState("success")
    } catch (failure) {
      if (!active.current) return
      const result = passwordResetError(failure)
      setError(result.message)
      if (result.invalidLink) {
        setPassword("")
        setConfirmation("")
        setState("invalid")
      }
    } finally {
      submitting.current = false
      if (active.current) setBusy(false)
    }
  }

  if (state === "checking") return <p role="status" className="mt-6 flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Checking your reset link…</p>
  if (state === "success") return <div className="mt-6 space-y-5">
    <div role="status" className="rounded-xl border border-border bg-secondary p-5"><CheckCircle2 aria-hidden="true" className="mb-3 size-6 text-accent" /><h2 className="text-lg font-semibold">Password updated</h2><p className="mt-2 text-sm">Your new password is ready. Sign in to your UCALL account to continue.</p></div>
    <Button asChild className="min-h-11 w-full"><Link href="/login">Sign in with your new password</Link></Button>
  </div>
  if (state === "invalid" || state === "error") return <div className="mt-6"><p role="alert" className="text-sm text-destructive">{error}</p>
    {state === "error" && <Button className="mt-4 min-h-11" onClick={() => { setError(""); setState("checking"); setAttempt(value => value + 1) }}>Try again</Button>}
    <ResetLinks />
  </div>

  return <form onSubmit={submit} className="mt-6 space-y-5" noValidate aria-busy={busy}>
    <p className="break-all text-sm text-muted-foreground">Resetting the password for <span className="font-medium text-foreground">{email}</span></p>
    <div>
      <Label htmlFor="new-password">New password</Label>
      <div className="relative mt-2">
        <Input ref={passwordInput} id="new-password" name="newPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" autoCapitalize="none" spellCheck={false} required minLength={6} maxLength={4096} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-invalid={Boolean(errors.password)} aria-describedby={`password-hint${errors.password ? " new-password-error" : ""}`} className="min-h-12 pr-12" />
        <button type="button" onClick={() => setShowPassword(value => !value)} disabled={busy} aria-label={showPassword ? "Hide new password" : "Show new password"} aria-controls="new-password" aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
      </div>
      <p id="password-hint" className="mt-2 text-xs text-muted-foreground">Use at least 6 characters. A longer, unique password is safer.</p>
      {errors.password && <p id="new-password-error" role="alert" className="mt-2 text-sm text-destructive">{errors.password}</p>}
    </div>
    <div>
      <Label htmlFor="confirm-password">Confirm new password</Label>
      <div className="relative mt-2">
        <Input ref={confirmationInput} id="confirm-password" name="confirmPassword" type={showConfirmation ? "text" : "password"} autoComplete="new-password" autoCapitalize="none" spellCheck={false} required maxLength={4096} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? "confirm-password-error" : undefined} className="min-h-12 pr-12" />
        <button type="button" onClick={() => setShowConfirmation(value => !value)} disabled={busy} aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"} aria-controls="confirm-password" aria-pressed={showConfirmation} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">{showConfirmation ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
      </div>
      {errors.confirmation && <p id="confirm-password-error" role="alert" className="mt-2 text-sm text-destructive">{errors.confirmation}</p>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{busy ? "Updating password…" : "Update password"}</Button>
    <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-accent underline">Back to sign in</Link>
  </form>
}

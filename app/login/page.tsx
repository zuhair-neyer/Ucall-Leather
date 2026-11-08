"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { AuthAlert } from "@/components/auth-alert"
import { getFriendlyAuthError, validateAuthForm } from "@/lib/auth-errors"
import { safeAuthRedirect } from "@/lib/auth-redirect"
import { JourneyAuthShell } from "@/components/site/journey-auth-shell"

function LoginForm() {
  const { login, isConfigured } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = safeAuthRedirect(params.get("next"))
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate form inputs
    const validationError = validateAuthForm(
      { email, password },
      "login"
    )
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isConfigured) {
      setError("Sign in service is unavailable. Please try again later.")
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      setSuccess(true)
      setError(null)
      router.replace(next)
    } catch (err: unknown) {
      const friendlyError = getFriendlyAuthError(err)
      setError(friendlyError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <AuthAlert
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <AuthAlert
          message="Welcome back! Redirecting..."
          type="success"
          autoClose={false}
        />
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-11"
            disabled={loading}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-11"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm"><Link href="/forgot-password" className="inline-flex min-h-11 items-center text-accent hover:underline">Forgot password?</Link></div>
      <p className="mt-4 text-center text-sm text-muted-foreground">New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="ml-1 inline-flex min-h-11 items-center font-medium text-accent hover:underline">Create an account</Link></p>
    </>
  )
}

export default function LoginPage() {
  return (
    <JourneyAuthShell title="Sign in" description="Welcome back to UCALL. Your favourite pieces and order details are right where you left them.">
      <Suspense fallback={null}><LoginForm /></Suspense>
    </JourneyAuthShell>
  )
}

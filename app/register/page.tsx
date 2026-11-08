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

function RegisterForm() {
  const { register, isConfigured } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = safeAuthRedirect(params.get("next"))
  const [name, setName] = useState("")
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
      { email, password, name },
      "register"
    )
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isConfigured) {
      setError("Sign up service is unavailable. Please try again later.")
      return
    }

    setLoading(true)
    try {
      await register(name, email, password)
      setSuccess(true)
      setError(null)
      router.replace(next)
    } catch (err: unknown) {
      const friendlyError = getFriendlyAuthError(err)
      setError(friendlyError)
      setLoading(false)
    }
  }

  return (
    <JourneyAuthShell title="Create your account" eyebrow="MAKE YOURSELF AT HOME" description="Join UCALL to save your details, follow your orders and find your next everyday companion.">
      {error && (
        <AuthAlert
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <AuthAlert
          message="Account created! Redirecting..."
          type="success"
          autoClose={false}
        />
      )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 min-h-11"
              maxLength={100}
              disabled={loading}
              autoComplete="name"
            />
          </div>
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
              minLength={6}
              className="mt-1 min-h-11"
              disabled={loading}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              At least 6 characters
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex min-h-11 items-center font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
    </JourneyAuthShell>
  )
}

export default function RegisterPage() {
  return <Suspense fallback={<p className="p-12 text-center text-muted-foreground">Loading sign up…</p>}><RegisterForm /></Suspense>
}

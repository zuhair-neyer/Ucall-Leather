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

function LoginForm() {
  const { login, isConfigured } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") ?? "/"
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
      setTimeout(() => {
        router.push(next)
      }, 1000)
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(err)
      setError(friendlyError)
      console.log("[v0] Login error:", err?.code || err?.message)
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
            className="mt-1"
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
            className="mt-1"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-serif text-3xl text-primary">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back to UCALL. Log in to continue.
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

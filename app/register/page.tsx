"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { AuthAlert } from "@/components/auth-alert"
import { getFriendlyAuthError, validateAuthForm } from "@/lib/auth-errors"

export default function RegisterPage() {
  const { register, isConfigured } = useAuth()
  const router = useRouter()
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
      setTimeout(() => {
        router.push("/")
      }, 1000)
    } catch (err: any) {
      const friendlyError = getFriendlyAuthError(err)
      setError(friendlyError)
      setLoading(false)
      console.log("[v0] Registration error:", err?.code || err?.message)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
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
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-serif text-3xl text-primary">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join UCALL to shop and track orders.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
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
              minLength={6}
              className="mt-1"
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
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

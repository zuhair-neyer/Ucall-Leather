"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Package, ShoppingCart, ShieldAlert } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/admin")
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">Loading...</div>
    )
  }

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="font-serif text-3xl text-primary">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin privileges. Ask a workspace owner to promote your
          Firestore user document to <code className="rounded bg-muted px-1">role: &quot;admin&quot;</code>.
        </p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside className="h-fit rounded-lg border border-border bg-card p-4">
        <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const Icon = l.icon
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" /> {l.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  )
}

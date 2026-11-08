"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Package, ShoppingCart, ShieldAlert, LayoutDashboard, Mail, Star, RotateCcw, MessageCircle } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/support", label: "Support chat", icon: MessageCircle },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, router, pathname])

  if (loading) {
    return (
      <div className="journey-page text-sm text-muted-foreground">Loading...</div>
    )
  }

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="journey-state flex max-w-2xl flex-col items-center gap-4 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="font-serif text-3xl text-primary">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin access. Contact the store owner if you should have access.
        </p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="journey-admin-shell grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="journey-admin-sidebar h-fit">
        <div className="journey-admin-brand"><span>UCALL</span><p>THE PRIVATE STUDIO</p></div>
        <nav aria-label="Admin navigation" className="grid grid-cols-2 gap-1 lg:flex lg:flex-col">
          {links.map((l) => {
            const Icon = l.icon
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
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
      <div className="journey-admin-content min-w-0">{children}</div>
    </div>
  )
}

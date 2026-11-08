"use client"

import Link from "next/link"
import { Headphones } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import type { StoreOrder } from "@/lib/order-status"
import { Button } from "@/components/ui/button"

export function OrderSupport({ order, unread = false }: { order: StoreOrder; unread?: boolean }) {
  const { user, isAdmin } = useAuth()
  if (!user || isAdmin || user.uid !== order.userId) return null
  return <Button asChild variant="outline" className="min-h-11">
    <Link href={`/orders/${encodeURIComponent(order.id)}/support`} aria-label={unread ? "Get support, new reply" : "Get support"}>
      <Headphones className="size-4" aria-hidden="true" />Get support
      {unread && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">New reply</span>}
    </Link>
  </Button>
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { Package } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { formatINR } from "@/lib/format"
import { ORDER_STATUS_LABELS, type StoreOrder } from "@/lib/order-status"
import { normalizeOrder, paymentMethodLabel, paymentStatusLabel } from "@/lib/order-normalization"
import { Button } from "@/components/ui/button"
import { OrderSupport } from "@/components/support/order-support"
import { useSupportNotifications } from "@/components/support/use-support-notifications"

export function OrdersView() {
  const { user, loading: authLoading, isConfigured, isAdmin } = useAuth()
  const router = useRouter()
  const support = useSupportNotifications()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!authLoading && isAdmin) router.replace("/admin/orders")
  }, [authLoading, isAdmin, router])
  useEffect(() => {
    if (!user || !isConfigured || authLoading || isAdmin) return
    setLoading(true)
    setError(false)
    return onSnapshot(query(collection(db, "orders"), where("userId", "==", user.uid)), snapshot => {
      setOrders(snapshot.docs.map(document => normalizeOrder(document.data(), document.id)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      setLoading(false)
    }, () => { setError(true); setLoading(false) })
  }, [user, isConfigured, authLoading, isAdmin])

  if (authLoading || isAdmin) return <div role="status" className="journey-page journey-page--narrow">{isAdmin ? "Opening order management…" : "Loading your account…"}</div>

  return <div className="journey-page journey-page--narrow">
    <header className="journey-heading"><p className="journey-eyebrow">THE JOURNEY TO YOUR DOOR</p><h1>My orders</h1><p>Track your orders, payments and delivery status.</p></header>
    {user && support.error && <p className="mt-3 text-xs text-muted-foreground">Reply notifications are temporarily unavailable. Open Get support on an order to check your conversation.</p>}
    {authLoading ? <p className="mt-8 animate-pulse">Loading your account…</p> : !user ? <div className="journey-panel mt-8 rounded-lg border border-border bg-card p-6"><p className="mb-4">Sign in to see your orders.</p><Button asChild className="min-h-11"><Link href="/login?next=/orders">Sign in</Link></Button></div> : !isConfigured || error ? <p role="alert" className="mt-8 rounded-lg border border-destructive p-4 text-destructive">Your orders could not load. Check your connection and refresh this page.</p> : loading ? <div className="mt-8 space-y-4" aria-label="Loading orders">{[1, 2, 3].map(id => <div key={id} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div> : orders.length === 0 ? <div className="journey-empty mt-8 rounded-lg border border-border bg-card px-6 py-16 text-center"><Package className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" /><h2 className="font-serif text-2xl text-primary">No orders yet</h2><p className="mb-6 mt-2 text-muted-foreground">Your first handcrafted piece is waiting.</p><Button asChild className="min-h-11"><Link href="/products">Shop the collection</Link></Button></div> : <div className="mt-8 space-y-4">{orders.map(order => <article key={order.id} className="journey-panel journey-order-card rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><h2 className="break-all text-sm font-semibold">Order {order.id}</h2><p className="mt-1 text-sm text-muted-foreground">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }) : "Just placed"}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${order.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}`}>{ORDER_STATUS_LABELS[order.status] || "Pending"}</span></div>
      <div className="journey-order-pieces"><div className="journey-order-thumbnails" aria-hidden="true">{order.items.slice(0, 3).map((item, index) => <div className="journey-order-thumbnail" key={`${item.id}-${index}`}><Image src={item.image || "/placeholder.svg"} alt="" fill sizes="54px" /></div>)}</div><p className="text-sm text-muted-foreground">{order.items.map(item => `${item.name} × ${item.quantity}`).join(" · ")}</p></div>
      {order.priority === "prioritised" && <p className="mt-3 text-xs font-semibold text-accent">Order prioritised</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><p className="journey-order-total text-xl font-semibold text-primary">{formatINR(order.total)}</p><p className="mt-1 text-xs text-muted-foreground">{paymentMethodLabel(order.paymentMethod)} · {paymentStatusLabel(order)}</p></div><div className="flex flex-wrap gap-2"><OrderSupport order={order} unread={support.unreadOrders.has(order.id)} /><Button asChild variant="outline" className="min-h-11"><Link href={`/orders/${order.id}`}>View order</Link></Button></div></div>
    </article>)}</div>}
  </div>
}


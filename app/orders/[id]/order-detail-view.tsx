"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { Check, Package, Printer, Truck } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { apiRequest } from "@/lib/client-api"
import { formatINR } from "@/lib/format"
import { recordedGst } from "@/lib/billing"
import { CONTACT, STORE_NAME } from "@/lib/config"
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type StoreOrder } from "@/lib/order-status"
import { normalizeOrder, paymentMethodLabel, paymentStatusLabel } from "@/lib/order-normalization"
import { Button } from "@/components/ui/button"
import { OrderSupport } from "@/components/support/order-support"
import { OrderPrintSlip } from "@/components/order-print-slip"
import { useSupportNotifications } from "@/components/support/use-support-notifications"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { user, isAdmin, loading: authLoading, isConfigured } = useAuth()
  const support = useSupportNotifications(orderId)
  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const validId = /^[a-zA-Z0-9_-]{1,120}$/.test(orderId)
  useEffect(() => {
    if (!user || !isConfigured || !validId) return
    setLoading(true)
    setOrder(null)
    setError(false)
    return onSnapshot(doc(db, "orders", orderId), snapshot => {
      setOrder(snapshot.exists() ? normalizeOrder(snapshot.data(), snapshot.id) : null)
      setLoading(false)
    }, () => { setError(true); setLoading(false) })
  }, [user, isConfigured, orderId, validId])

  async function cancelOrder() {
    if (!user) return
    setCancelling(true)
    try {
      await apiRequest(user, `/api/orders/${orderId}/cancel`, {})
      toast.success("Order cancelled. Any prepaid refund will be shown here.")
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Cancellation could not be completed.") }
    finally { setCancelling(false) }
  }

  if (authLoading) return <div className="mx-auto max-w-4xl animate-pulse px-4 py-16">Loading your account…</div>
  if (!user) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Your order</h1><p className="my-4">Sign in with the account used to place this order.</p><Button asChild className="min-h-11"><Link href={`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`}>Sign in</Link></Button></div>
  if (!isConfigured || !validId || error) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Order unavailable</h1><p role="alert" className="my-4 text-muted-foreground">This order could not be loaded. Make sure you are signed in with the account that placed it, then refresh.</p><Link href={isAdmin ? "/admin/orders" : "/orders"} className="underline">{isAdmin ? "Back to all orders" : "Back to my orders"}</Link></div>
  if (loading) return <div aria-label="Loading order" className="mx-auto max-w-4xl space-y-4 px-4 py-16"><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-80 animate-pulse rounded-lg bg-muted" /></div>
  if (!order) return <div className="journey-state"><h1 className="font-serif text-3xl text-primary">Order not found</h1><Link href={isAdmin ? "/admin/orders" : "/orders"} className="mt-6 inline-block underline">{isAdmin ? "Back to all orders" : "Back to my orders"}</Link></div>
  const cancellable = order.status === "pending" || (isAdmin && order.status === "confirmed")
  const paid = order.paymentStatus === "paid"
  const gst = recordedGst(order)
  const timeline = ORDER_STATUSES.filter(status => status !== "cancelled")
  const currentStep = timeline.indexOf(order.status as typeof timeline[number])
  const trackingUrl = order.tracking?.url && /^https:\/\//.test(order.tracking.url) ? order.tracking.url : null

  return <div className="order-document journey-page journey-order-page">
    <OrderPrintSlip order={order} />
    <div className="order-screen">
    <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3"><Link href={isAdmin ? "/admin/orders" : "/orders"} className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">← {isAdmin ? "All orders" : "My orders"}</Link><div className="flex flex-wrap gap-2"><OrderSupport order={order} unread={support.unreadOrders.has(order.id)} />{isAdmin && user.uid !== order.userId && <Button asChild variant="outline" className="min-h-11"><Link href={`/admin/support?order=${order.id}`}>Support chat</Link></Button>}<Button variant="outline" onClick={() => window.print()} className="min-h-11"><Printer className="mr-2 size-4" />Print packing slip</Button></div></div>
    <div className="journey-order-hero mb-8"><p className="journey-eyebrow">{STORE_NAME}</p><h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl">{order.status === "cancelled" ? "Order cancelled" : order.paymentStatus === "refund_needed" ? "Refund being arranged" : order.paymentStatus === "awaiting_payment" || order.paymentStatus === "failed" ? "Order awaiting payment" : "Thank you for your order"}</h1><p className="mt-3 break-all text-sm">Order number: <strong>{order.id}</strong></p><p className="mt-1 text-sm text-muted-foreground">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "Just placed"}</p></div>
    {(order.paymentStatus === "awaiting_payment" || order.paymentStatus === "failed") && order.status !== "cancelled" && <div role="status" className="print-hidden mb-6 rounded-lg border border-border bg-secondary p-4 text-sm">Payment has not been confirmed. If money was debited, please wait for this page to update before trying again. Your order is already saved. <Link href="/cart" className="font-medium underline">Return to your cart</Link> to retry, or contact us with your order number.</div>}
    {order.priority === "prioritised" && <p className="mb-6 rounded-lg border border-accent/30 bg-secondary p-4 text-sm font-semibold text-primary">Order prioritised<span className="mt-1 block text-xs font-normal text-muted-foreground">Your faster-delivery request is visible to our team. Delivery timing remains subject to availability and the courier.</span></p>}
    {order.paymentStatus === "refund_needed" && <p role="status" className="mb-6 rounded-lg border border-border bg-secondary p-4 text-sm">A refund is required for this prepaid order. Contact <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> with your order number if you need an update.</p>}
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="journey-panel rounded-lg border border-border bg-card p-5"><h2 className="font-serif text-xl text-primary">Order status</h2><p className="mt-3 font-medium">{ORDER_STATUS_LABELS[order.status]}</p>{order.status !== "cancelled" ? <ol className="journey-order-timeline mt-4 space-y-3">{timeline.map((status, index) => <li key={status} aria-current={order.status === status ? "step" : undefined} className={`flex items-center gap-3 text-sm ${index <= currentStep ? "text-primary" : "text-muted-foreground"}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${index <= currentStep ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{index <= currentStep ? <Check className="size-3" aria-hidden="true" /> : index + 1}</span>{ORDER_STATUS_LABELS[status]}{order.status === status && <span className="sr-only"> — current status</span>}</li>)}</ol> : <p className="mt-3 text-sm text-muted-foreground">This order will not be shipped.</p>}
        {order.tracking?.number && <div className="mt-5 border-t border-border pt-4 text-sm"><p className="flex items-center gap-2 font-medium"><Truck className="size-4" />{order.tracking.carrier || "Shipment"}</p><p className="mt-1 break-all">Tracking: {order.tracking.number}</p>{trackingUrl && <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-accent underline">Track shipment</a>}</div>}
      </section>
      <section className="journey-panel rounded-lg border border-border bg-card p-5"><h2 className="font-serif text-xl text-primary">Payment</h2><p className="mt-3 text-sm">{paymentMethodLabel(order.paymentMethod)}</p><p className="mt-2 text-sm font-medium">{paymentStatusLabel(order)}</p>{order.paymentMethod === "cod" && !["cancelled", "delivered"].includes(order.status) && !paid && <p className="mt-2 text-sm text-muted-foreground">Please pay {formatINR(order.total)} on delivery.</p>}{order.paymentMethod === "cod" && order.status === "delivered" && order.paymentStatus === "cod_pending" && <p className="mt-2 text-sm text-muted-foreground">This older order has no recorded cash collection status. Contact the store if you need confirmation; please do not pay again.</p>}{order.razorpay?.orderId && <p className="mt-4 break-all text-xs text-muted-foreground">Razorpay order: {order.razorpay.orderId}</p>}{order.razorpay?.paymentId && <p className="mt-2 break-all text-xs text-muted-foreground">Payment ID: {order.razorpay.paymentId}</p>}</section>
    </div>
    <section className="journey-panel journey-order-items mt-6 rounded-lg border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-serif text-xl text-primary"><Package className="size-5" />Items</h2><div className="mt-5 divide-y divide-border">{order.items.map(item => <div key={item.id} className="flex items-center gap-4 py-4"><div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={item.image || "/placeholder.svg"} alt={item.name} fill sizes="64px" className="object-cover" /></div><div className="min-w-0 flex-1"><p className="font-medium">{item.name}</p><p className="mt-1 text-sm text-muted-foreground">{item.quantity} × {formatINR(item.price)}</p></div><p className="text-sm font-semibold">{formatINR(Math.round(item.price * 100) * item.quantity / 100)}</p></div>)}</div><dl className="ml-auto mt-4 max-w-sm space-y-3 border-t border-border pt-4 text-sm"><div className="flex justify-between gap-4"><dt>Merchandise subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>{gst && <div className="flex justify-between gap-4"><dt>GST ({gst.rate}%)</dt><dd>{formatINR(gst.amount)}</dd></div>}<div className="flex justify-between gap-4"><dt>Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div><div className="flex justify-between gap-4 text-lg font-semibold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div></dl><p className="mt-4 text-xs text-muted-foreground">{gst ? "18% GST has been added to the merchandise subtotal." : "GST was not recorded on this older order. The original total is unchanged."}</p></section>
    <section className="journey-panel journey-order-items mt-6 rounded-lg border border-border bg-card p-5"><h2 className="font-serif text-xl text-primary">Delivery address</h2><address className="mt-4 space-y-1 text-sm not-italic"><p className="font-semibold">{order.shippingAddress.name}</p><p>{order.shippingAddress.address}</p><p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p><p>India</p><p>Phone: {order.shippingAddress.phone}</p><p className="break-all">Email: {order.shippingAddress.email}</p></address></section>
    <div className="mt-6 text-xs leading-relaxed text-muted-foreground"><p>{CONTACT.address}</p><p>{CONTACT.email} · {CONTACT.phone}</p><p className="mt-2">Packing slip / order summary. This is not a GST tax invoice.</p></div>
    {cancellable && <div className="print-hidden mt-8 border-t border-border pt-6"><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={cancelling} className="min-h-11 text-destructive">{cancelling ? "Cancelling…" : "Cancel order"}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel this order?</AlertDialogTitle><AlertDialogDescription>The order will not be shipped. Reserved stock will be returned to the store, and any prepaid payment will be flagged for a refund.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11">Keep order</AlertDialogCancel><AlertDialogAction onClick={cancelOrder} className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel order</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>}
    </div>
  </div>
}


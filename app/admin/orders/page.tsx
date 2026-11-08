"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { adminRequest, errorMessage, useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatINR } from "@/lib/format"
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus, type StoreOrder } from "@/lib/order-status"
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/order-normalization"

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { pending: "confirmed", confirmed: "shipped", shipped: "delivered" }
const emptyTracking = { carrier: "", number: "", url: "" }

export default function AdminOrdersPage() {
  const { data: orders, loading, error } = useAdminCollection<StoreOrder>("orders")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [busy, setBusy] = useState("")
  const [cancelTarget, setCancelTarget] = useState<StoreOrder | null>(null)
  const [trackingTarget, setTrackingTarget] = useState<StoreOrder | null>(null)
  const [tracking, setTracking] = useState({ ...emptyTracking })
  const activePriority = (order: StoreOrder) => order.priority === "prioritised" && !["delivered", "cancelled"].includes(order.status)
  const filtered = orders.filter(order => (!filter || order.status === filter) && (!priorityFilter || order.priority === "prioritised") && `${order.id} ${order.userName} ${order.userEmail} ${order.shippingAddress?.name} ${order.shippingAddress?.phone}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(activePriority(b)) - Number(activePriority(a)) || (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))

  const updateStatus = async (order: StoreOrder, status: OrderStatus) => {
    if (status === order.status) return
    if (status === "cancelled") { setCancelTarget(order); return }
    setBusy(order.id)
    try {
      await adminRequest(`/api/admin/orders/${order.id}`, "PATCH", { status })
      toast.success(`Order marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`)
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }
  const cancelOrder = async () => {
    if (!cancelTarget) return
    setBusy(cancelTarget.id)
    try {
      await adminRequest(`/api/orders/${cancelTarget.id}/cancel`, "POST", {})
      toast.success(cancelTarget.paymentMethod === "razorpay" && cancelTarget.paymentStatus === "paid" ? "Order cancelled. Check the refund status in the order details." : cancelTarget.stockDeducted === undefined ? "Order cancelled. Please check stock counts for this older order." : "Order cancelled and any deducted stock returned.")
      setCancelTarget(null)
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }
  const saveTracking = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!trackingTarget) return
    if (tracking.url && !/^https:\/\//i.test(tracking.url)) { toast.error("Use a secure tracking link starting with https://."); return }
    setBusy(trackingTarget.id)
    try {
      await adminRequest(`/api/admin/orders/${trackingTarget.id}`, "PATCH", { status: trackingTarget.status, tracking })
      toast.success("Tracking details saved.")
      setTrackingTarget(null)
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }

  return <div>
    <h1 className="font-serif text-3xl text-primary">Orders</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage fulfillment, delivery tracking and cancellations. Active prioritised orders appear first.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_170px]">
      <div><Label htmlFor="order-search" className="sr-only">Search order ID, customer name or phone</Label><Input id="order-search" className="min-h-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Order ID, name or phone" /></div>
      <div><Label htmlFor="order-filter" className="sr-only">Filter by status</Label><select id="order-filter" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={event => setFilter(event.target.value)}><option value="">All statuses</option>{ORDER_STATUSES.map(status => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}</select></div>
      <div><Label htmlFor="priority-filter" className="sr-only">Filter by priority</Label><select id="priority-filter" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option value="">All priorities</option><option value="prioritised">Prioritised orders</option></select></div>
    </div>
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
      <CollectionState loading={loading} error={error} empty={!filtered.length} emptyMessage={orders.length ? "No orders match these filters." : "No orders yet."} />
      {!loading && !error && <div className="divide-y divide-border">{filtered.map(order => {
        const canFulfill = order.paymentMethod === "cod" || order.paymentStatus === "paid"
        const following = nextStatus[order.status]
        return <article key={order.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_190px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Link className="break-all font-mono text-xs text-accent underline" href={`/orders/${order.id}`}>#{order.id}</Link><Badge variant="secondary">{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>{order.priority === "prioritised" && <Badge>Prioritised</Badge>}</div>
            <p className="mt-2 font-medium">{order.userName || order.shippingAddress?.name || "Customer"}</p>
            <p className="break-words text-sm text-muted-foreground">{order.shippingAddress?.phone} · {order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
            <p className="mt-2 text-sm">{paymentMethodLabel(order.paymentMethod)} · <span className={order.paymentStatus === "refund_needed" ? "font-semibold text-destructive" : "text-muted-foreground"}>{paymentStatusLabel(order)}</span></p>
            {order.paymentStatus === "refund_needed" && <p className="mt-1 text-xs text-destructive">This customer needs a refund. Review the payment details before arranging it in Razorpay.</p>}
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{order.items?.map(item => <li key={item.id}>{item.name} × {item.quantity} — {formatINR(item.price * item.quantity)}</li>)}</ul>
            {order.tracking?.number && <p className="mt-3 break-words text-xs text-muted-foreground">Tracking: {order.tracking.carrier} · {order.tracking.number}</p>}
            {order.createdAt?.seconds && <p className="mt-3 text-xs text-muted-foreground">{new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>}
          </div>
          <div className="flex flex-col items-start gap-3">
            <p className="text-lg font-semibold text-primary">{formatINR(order.total)}</p>
            <div className="w-full"><Label htmlFor={`status-${order.id}`} className="text-xs">Fulfillment status</Label><select id={`status-${order.id}`} className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60" value={order.status} disabled={busy === order.id || order.status === "delivered" || order.status === "cancelled"} onChange={event => void updateStatus(order, event.target.value as OrderStatus)}>
              {ORDER_STATUSES.map(status => <option key={status} value={status} disabled={status !== order.status && !(status === following && canFulfill) && !(status === "cancelled" && ["pending", "confirmed"].includes(order.status))}>{ORDER_STATUS_LABELS[status]}</option>)}
            </select></div>
            {!canFulfill && !["cancelled", "delivered"].includes(order.status) && <p className="text-xs text-muted-foreground">Fulfillment is available after payment is confirmed.</p>}
            <Button className="min-h-11 w-full" variant="outline" asChild><Link href={`/orders/${order.id}`}>Details & packing slip</Link></Button>
            <Button className="min-h-11 w-full" variant="outline" asChild><Link href={`/admin/support?order=${order.id}`}>Support chat</Link></Button>
            {order.status !== "cancelled" && <Button className="min-h-11 w-full" variant="ghost" disabled={busy === order.id} onClick={() => { setTrackingTarget(order); setTracking(order.tracking ?? { ...emptyTracking }) }}>Edit tracking</Button>}
          </div>
        </article>
      })}</div>}
    </div>
    <Dialog open={Boolean(cancelTarget)} onOpenChange={value => { if (!value && !busy) setCancelTarget(null) }}><DialogContent><DialogHeader><DialogTitle>Cancel this order?</DialogTitle><DialogDescription>Any deducted stock will be returned once. If this order was paid, its refund status will be shown in the order details.</DialogDescription></DialogHeader><DialogFooter><Button className="min-h-11" variant="outline" disabled={Boolean(busy)} onClick={() => setCancelTarget(null)}>Keep order</Button><Button className="min-h-11" variant="destructive" disabled={Boolean(busy)} onClick={() => void cancelOrder()}>{busy ? "Cancelling…" : "Cancel order"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(trackingTarget)} onOpenChange={value => { if (!value && !busy) setTrackingTarget(null) }}><DialogContent><DialogHeader><DialogTitle>Delivery tracking</DialogTitle><DialogDescription>These details are visible to the customer on their order page.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={saveTracking}><div><Label htmlFor="tracking-carrier">Courier / carrier</Label><Input id="tracking-carrier" value={tracking.carrier} maxLength={100} onChange={event => setTracking({ ...tracking, carrier: event.target.value })} /></div><div><Label htmlFor="tracking-number">Tracking number</Label><Input id="tracking-number" value={tracking.number} maxLength={100} onChange={event => setTracking({ ...tracking, number: event.target.value })} /></div><div><Label htmlFor="tracking-url">Tracking link (optional)</Label><Input id="tracking-url" type="url" value={tracking.url} maxLength={1000} placeholder="https://" onChange={event => setTracking({ ...tracking, url: event.target.value })} /></div><DialogFooter><Button className="min-h-11" type="button" variant="outline" disabled={Boolean(busy)} onClick={() => setTrackingTarget(null)}>Cancel</Button><Button className="min-h-11" disabled={Boolean(busy)} type="submit">{busy ? "Saving…" : "Save tracking"}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>
}

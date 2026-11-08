"use client"

import Link from "next/link"
import { useAdminCollection } from "@/components/admin/admin-data"
import { CollectionState } from "@/components/admin/collection-state"
import { formatINR } from "@/lib/format"
import { ORDER_STATUS_LABELS, type StoreOrder } from "@/lib/order-status"
import { countsAsRevenue } from "@/lib/order-normalization"

interface StockProduct { id: string; name: string; stock: number }
interface RefundTask { id: string; status: string }
interface EmailTask { id: string; orderId: string; status: string; attempts: number; lastError?: string; kind?: "confirmation" | "status" | "payment"; orderStatus?: keyof typeof ORDER_STATUS_LABELS }

export default function AdminDashboard() {
  const orders = useAdminCollection<StoreOrder>("orders")
  const products = useAdminCollection<StockProduct>("products")
  const refunds = useAdminCollection<RefundTask>("refunds")
  const emails = useAdminCollection<EmailTask>("emailOutbox")
  const revenue = orders.data.reduce((sum, order) => {
    const counted = countsAsRevenue(order)
    return sum + (counted ? order.total : 0)
  }, 0)
  const pending = orders.data.filter(order => order.status === "pending").length
  const lowStock = products.data.filter(product => (product.stock ?? 0) <= 5).sort((a, b) => a.stock - b.stock)
  const latest = [...orders.data].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)).slice(0, 5)
  const refundCount = refunds.data.filter(refund => refund.status !== "refunded").length
  const pendingEmails = emails.data.filter(email => email.status !== "sent")
  const stats = [
    { label: "Total orders", value: orders.data.length },
    { label: "Revenue", value: formatINR(revenue) },
    { label: "Pending orders", value: pending },
    { label: "Low-stock products", value: lowStock.length },
  ]
  const loading = orders.loading || products.loading
  const error = orders.error || products.error

  return <div>
    <h1 className="font-serif text-3xl text-primary">Store dashboard</h1>
    <p className="mt-1 text-sm text-muted-foreground">An overview of your store, updated live.</p>
    <CollectionState loading={loading} error={error} empty={false} emptyMessage="" />
    {!loading && !error && <>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(stat => <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-primary">{stat.value}</p>
        </div>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Revenue includes orders with a recorded paid status, including cash collected on delivery. Cancelled orders, refunds and older orders without payment records are excluded. Shipping and GST are included.</p>
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="font-serif text-xl text-primary">Needs attention</h2>
        <CollectionState loading={refunds.loading || emails.loading} error={refunds.error || emails.error} empty={false} emptyMessage="" />
        {!refunds.loading && !emails.loading && !refunds.error && !emails.error && <div className="mt-3 space-y-3 text-sm">
          <Link href="/admin/refunds" className={`inline-flex min-h-11 items-center underline ${refundCount ? "font-semibold text-destructive" : "text-accent"}`}>{refundCount} payment{refundCount === 1 ? "" : "s"} awaiting a refund</Link>
          <p>{pendingEmails.length} order email{pendingEmails.length === 1 ? "" : "s"} awaiting delivery.</p>
          {pendingEmails.length > 0 && <><p className="text-xs text-muted-foreground">Order confirmations and status updates retry on the configured email schedule. If messages remain here, check the Gmail sender settings and email setup steps in the project README.</p><ul className="space-y-2">{pendingEmails.slice(0, 5).map(email => <li key={email.id}><Link href={`/orders/${email.orderId}`} className="break-all text-accent underline">Order #{email.orderId}</Link><span className="block text-xs font-medium">{email.kind === "status" && email.orderStatus ? `${ORDER_STATUS_LABELS[email.orderStatus]} update` : email.kind === "payment" ? "Payment update" : "Order confirmation"}</span><span className="block text-xs text-muted-foreground">{email.attempts ?? 0} delivery attempt{email.attempts === 1 ? "" : "s"}{email.lastError ? ` · ${email.lastError}` : ""}</span></li>)}</ul></>}
        </div>}
      </section>
      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-primary">Latest orders</h2><Link className="inline-flex min-h-11 items-center text-sm text-accent underline" href="/admin/orders">View all orders</Link></div>
        {!latest.length ? <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p> : <ul className="mt-2 divide-y divide-border">
          {latest.map(order => <li key={order.id}><Link href={`/orders/${order.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-3 hover:text-accent">
            <span><span className="block font-medium">{order.userName}</span><span className="break-all text-xs text-muted-foreground">#{order.id}</span></span>
            <span className="text-right text-sm">{formatINR(order.total)}<span className="block text-xs text-muted-foreground">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></span>
          </Link></li>)}
        </ul>}
      </section>
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-primary">Stock to check</h2><Link className="inline-flex min-h-11 items-center text-sm text-accent underline" href="/admin/products">Manage products</Link></div>
        {!lowStock.length ? <p className="mt-4 text-sm text-muted-foreground">All products have more than five units in stock.</p> : <ul className="mt-2 divide-y divide-border">{lowStock.map(product => <li key={product.id} className="flex justify-between gap-3 py-3 text-sm"><span>{product.name}</span><span className={product.stock === 0 ? "font-semibold text-destructive" : "font-semibold text-accent"}>{product.stock ?? 0} left</span></li>)}</ul>}
      </section>
    </>}
  </div>
}

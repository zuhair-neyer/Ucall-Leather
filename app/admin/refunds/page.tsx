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
import { formatINR } from "@/lib/format"

interface Refund { id: string; orderId: string; paymentId: string; amount: number; reason: string; status: "refund_needed" | "refunded"; createdAt?: { seconds: number } }
const reasons: Record<string, string> = { cancelled: "Order cancelled", out_of_stock: "Stock sold out before payment", duplicate_payment: "Additional payment for the same order" }

export default function AdminRefundsPage() {
  const { data: refunds, loading, error } = useAdminCollection<Refund>("refunds")
  const [search, setSearch] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [busy, setBusy] = useState("")
  const filtered = refunds.filter(refund => (showCompleted || refund.status !== "refunded") && `${refund.orderId} ${refund.paymentId}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
  const reconcile = async (refund: Refund) => {
    setBusy(refund.id)
    try {
      await adminRequest(`/api/admin/refunds/${refund.paymentId}/reconcile`, "POST", {})
      toast.success("Razorpay confirmed the full refund. The store records are updated.")
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy("") }
  }

  return <div>
    <h1 className="font-serif text-3xl text-primary">Refunds</h1>
    <p className="mt-1 text-sm text-muted-foreground">Payments that need a full refund, including additional payments for the same order.</p>
    <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-5 text-sm leading-relaxed">
      <p className="font-medium text-primary">Refunds are completed in Razorpay.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5"><li>Open the <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" className="text-accent underline">Razorpay dashboard</a> and select the correct Test or Live mode.</li><li>Find the exact payment ID shown below and issue a full refund.</li><li>Once Razorpay completes it, choose “Check refund status” here. The server verifies it before marking the refund complete.</li></ol>
      <p className="mt-2 text-muted-foreground">An additional payment refund leaves the original paid order active. Refund the payment ID shown here, not another payment on that order.</p>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-4"><div className="min-w-0 flex-1"><Label htmlFor="refund-search" className="sr-only">Search refunds by order or payment ID</Label><Input id="refund-search" className="min-h-11" value={search} placeholder="Order ID or payment ID" onChange={event => setSearch(event.target.value)} /></div><label className="flex min-h-11 items-center gap-2 text-sm"><input className="size-5 accent-primary" type="checkbox" checked={showCompleted} onChange={event => setShowCompleted(event.target.checked)} /> Include completed</label></div>
    <div className="mt-4 rounded-lg border border-border bg-card">
      <CollectionState loading={loading} error={error} empty={!filtered.length} emptyMessage={search ? "No refunds match your search." : "No refunds need attention."} />
      {!loading && !error && <div className="divide-y divide-border">{filtered.map(refund => <article key={refund.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link className="break-all font-mono text-xs text-accent underline" href={`/orders/${refund.orderId}`}>Order #{refund.orderId}</Link><Badge variant={refund.status === "refunded" ? "secondary" : "destructive"}>{refund.status === "refunded" ? "Refunded" : "Refund needed"}</Badge></div><p className="mt-2 break-all text-sm">Payment: <code className="select-all">{refund.paymentId}</code></p><p className="mt-2 text-sm text-muted-foreground">{reasons[refund.reason] ?? refund.reason}</p>{refund.createdAt?.seconds && <p className="mt-2 text-xs text-muted-foreground">{new Date(refund.createdAt.seconds * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>}</div>
        <div className="space-y-3"><p className="text-lg font-semibold text-primary">{formatINR(refund.amount / 100)}</p>{refund.status !== "refunded" && <Button className="min-h-11" variant="outline" disabled={busy === refund.id} onClick={() => void reconcile(refund)}>{busy === refund.id ? "Checking Razorpay…" : "Check refund status"}</Button>}</div>
      </article>)}</div>}
    </div>
  </div>
}

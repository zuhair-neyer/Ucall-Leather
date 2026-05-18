"use client"

import { useEffect, useState } from "react"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/format"

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const
type Status = (typeof STATUSES)[number]

interface Order {
  id: string
  userName?: string
  userEmail?: string
  items: { id: string; name: string; price: number; quantity: number }[]
  total: number
  status: Status
  createdAt?: { seconds: number }
  shippingAddress?: { city?: string; state?: string }
}

const statusColor: Record<Status, string> = {
  pending: "bg-yellow-100 text-yellow-900",
  processing: "bg-blue-100 text-blue-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-900",
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) })))
        setLoading(false)
      },
      (err) => {
        console.log("[v0] admin orders error:", err)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const updateStatus = async (id: string, status: Status) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "orders", id), { status })
      toast.success(`Order marked as ${status}`)
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed.")
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-primary">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage fulfillment status for every order.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                    <Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge>
                  </div>
                  <p className="mt-1 font-medium">{o.userName ?? o.userEmail ?? "Customer"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.shippingAddress?.city}, {o.shippingAddress?.state}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {o.items?.map((it) => (
                      <li key={it.id}>
                        {it.name} × {it.quantity} — {formatINR(it.price * it.quantity)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p className="text-lg font-semibold text-primary">{formatINR(o.total)}</p>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as Status)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

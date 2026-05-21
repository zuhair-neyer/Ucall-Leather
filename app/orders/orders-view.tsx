"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { toast } from "sonner"

import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { formatINR } from "@/lib/format"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  userId: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  shippingAddress: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    pincode: string
  }
  paymentMethod: "Cash on Delivery" | "Razorpay"
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  createdAt: any
  updatedAt?: any
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels: Record<Order["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

function formatDate(date: any) {
  if (!date) return ""
  try {
    return new Date(date.seconds * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export function OrdersView() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user || !db) {
      if (!authLoading && !user) setLoading(false)
      return
    }

    setLoading(true)

    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      )

      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[]
        setOrders(data)
        setLoading(false)
      })

      return () => unsub()
    } catch (err: any) {
      console.error("[v0] Error fetching orders:", err)
      toast.error("Failed to load orders")
      setLoading(false)
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-20">
        <div className="mx-auto max-w-4xl px-4">
          <Link
            href="/products"
            className="mb-6 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shopping
          </Link>

          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Sign in Required</h2>
            <p className="mb-6 text-muted-foreground">
              You need to be logged in to view your orders.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <div className="mx-auto max-w-4xl px-4">
        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shopping
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
          <p className="mt-2 text-muted-foreground">
            Track your orders and delivery status
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">No orders yet</h2>
            <p className="mb-6 text-muted-foreground">
              Start shopping to place your first order.
            </p>
            <Link
              href="/products"
              className="inline-block rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-card p-6"
              >
                {/* Order Header */}
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === order.id ? null : order.id)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-muted-foreground">
                          Order ID: {order.id.slice(0, 8)}...
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status]}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatINR(order.total)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ordered on {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {order.items.length} item{order.items.length > 1 ? "s" : ""}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.paymentMethod}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === order.id && (
                  <div className="mt-6 border-t border-border pt-6">
                    {/* Items */}
                    <div className="mb-6">
                      <h3 className="mb-3 font-semibold text-foreground">
                        Items
                      </h3>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-muted p-3"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {item.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold text-foreground">
                              {formatINR(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="mb-6 space-y-2 border-b border-border pb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold text-foreground">
                          {formatINR(order.subtotal)}
                        </span>
                      </div>
                      {order.shipping > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping</span>
                          <span className="font-semibold text-foreground">
                            {formatINR(order.shipping)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Shipping Address */}
                    <div className="mb-6">
                      <h3 className="mb-3 font-semibold text-foreground">
                        Shipping Address
                      </h3>
                      <div className="space-y-1 rounded bg-muted p-4 text-sm">
                        <p className="font-medium text-foreground">
                          {order.shippingAddress.name}
                        </p>
                        <p className="text-muted-foreground">
                          {order.shippingAddress.address}
                        </p>
                        <p className="text-muted-foreground">
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.state}{" "}
                          {order.shippingAddress.pincode}
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          Phone: {order.shippingAddress.phone}
                        </p>
                        <p className="text-muted-foreground">
                          Email: {order.shippingAddress.email}
                        </p>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div>
                      <h3 className="mb-3 font-semibold text-foreground">
                        Status Timeline
                      </h3>
                      <div className="space-y-2">
                        {["pending", "confirmed", "shipped", "delivered"].map(
                          (s) => {
                            const isCompleted = [
                              "pending",
                              "confirmed",
                              "shipped",
                              "delivered",
                            ].indexOf(s) <=
                              [
                                "pending",
                                "confirmed",
                                "shipped",
                                "delivered",
                              ].indexOf(order.status as any)
                            const isCurrent = s === order.status
                            return (
                              <div key={s} className="flex items-center gap-3">
                                <div
                                  className={`h-3 w-3 rounded-full ${
                                    isCompleted
                                      ? "bg-green-500"
                                      : "bg-muted"
                                  } ${isCurrent ? "ring-2 ring-green-500" : ""}`}
                                />
                                <span
                                  className={
                                    isCompleted
                                      ? "font-semibold text-foreground"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {statusLabels[s as Order["status"]]}
                                </span>
                              </div>
                            )
                          },
                        )}
                        {order.status === "cancelled" && (
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="font-semibold text-red-500">
                              Cancelled
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

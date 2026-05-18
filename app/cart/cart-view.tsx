"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { formatINR } from "@/lib/format"

declare global {
  interface Window {
    Razorpay?: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false)
    if (window.Razorpay) return resolve(true)
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function CartView() {
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart()
  const { user, profile } = useAuth()
  const [placing, setPlacing] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  const shipping = subtotal > 0 && subtotal < 5000 ? 199 : 0
  const total = subtotal + shipping

  const onPay = async () => {
    if (!user) {
      toast.error("Please sign in to checkout.")
      return
    }
    if (!items.length) return
    const required = ["name", "email", "phone", "address", "city", "state", "pincode"] as const
    for (const k of required) {
      if (!form[k].trim()) {
        toast.error(`Please fill in your ${k}.`)
        return
      }
    }
    setPlacing(true)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error("Could not load Razorpay")

      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create order")

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!keyId) throw new Error("Razorpay key not configured.")

      const options = {
        key: keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "UCALL Leather Co.",
        description: "Order payment",
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#3B1F0A" },
        handler: async (response: any) => {
          try {
            if (!db) throw new Error("Firestore not configured")
            await addDoc(collection(db, "orders"), {
              userId: user.uid,
              userEmail: user.email,
              userName: profile?.name ?? form.name,
              items: items.map((i) => ({
                id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                image: i.image,
              })),
              subtotal,
              shipping,
              total,
              shippingAddress: form,
              payment: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              status: "pending",
              createdAt: serverTimestamp(),
            })
            clearCart()
            toast.success("Payment successful! Your order has been placed.")
            window.location.href = "/"
          } catch (err) {
            console.log("[v0] save order error:", err)
            toast.error("Payment received but saving order failed.")
          }
        },
        modal: {
          ondismiss: () => setPlacing(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.log("[v0] checkout error:", err)
      toast.error(err.message ?? "Checkout failed.")
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-serif text-2xl text-primary">Your cart is empty</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Explore our handcrafted collection and find a piece you&apos;ll love for years.
        </p>
        <Link href="/products">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Shop the collection
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      {/* Items & address */}
      <div className="space-y-8">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={item.image || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <Link
                  href={`/products/${item.id}`}
                  className="font-serif text-lg text-foreground hover:text-accent"
                >
                  {item.name}
                </Link>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {item.category}
                </p>
                <p className="mt-1 text-sm font-medium text-primary">{formatINR(item.price)}</p>
              </div>
              <div className="flex items-center rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2 hover:bg-secondary"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2 hover:bg-secondary"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="p-2 text-muted-foreground hover:text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-serif text-xl text-primary">Shipping address</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-xl text-primary">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatINR(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="font-medium">{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-semibold text-primary">Total</dt>
            <dd className="font-semibold text-primary">{formatINR(total)}</dd>
          </div>
        </dl>

        {!user && (
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/login" className="text-accent underline">
              Sign in
            </Link>{" "}
            to place your order.
          </p>
        )}

        <Button
          onClick={onPay}
          disabled={placing || !user}
          size="lg"
          className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {placing ? "Processing..." : `Pay ${formatINR(total)}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure payments by Razorpay.
        </p>
      </aside>
    </div>
  )
}

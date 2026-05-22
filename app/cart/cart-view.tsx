"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Minus, Plus, Trash2, ShoppingBag, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc, increment, onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"
import { SavedAddress } from "@/lib/address"

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
  const { items, updateQuantity, removeItem, subtotal, clearCart } =
    useCart()

  const { user, profile } = useAuth()

  const [placing, setPlacing] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState("cod")

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  
  // Track real-time stock for all cart items
  const [productStocks, setProductStocks] = useState<Record<string, number>>({})

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  // Fetch saved addresses on component mount
  useEffect(() => {
    if (!user || !db) return

    const fetchAddresses = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const addresses = userDoc.data().addresses || []
          setSavedAddresses(addresses)
          // Pre-fill form with first address if available
          if (addresses.length > 0 && !form.address) {
            const addr = addresses[0]
            setForm({
              name: profile?.name || "",
              email: user.email || "",
              phone: addr.phone,
              address: addr.street,
              city: addr.city,
              state: addr.state,
              pincode: addr.pincode,
            })
            setSelectedAddressId(addr.id)
          }
        }
      } catch (err) {
        console.log("[v0] Error fetching addresses:", err)
      }
    }

    fetchAddresses()
  }, [user, db, profile])

  // Real-time listeners for product stock in cart
  useEffect(() => {
    if (!db || items.length === 0) return

    const unsubscribers: (() => void)[] = []

    items.forEach((item) => {
      const unsubscribe = onSnapshot(
        doc(db, "products", item.id),
        (docSnap) => {
          if (docSnap.exists()) {
            const stock = docSnap.data().stock ?? 0
            setProductStocks((prev) => ({ ...prev, [item.id]: stock }))
          }
        },
        (error) => {
          console.log("[v0] Error listening to product stock:", error)
        }
      )
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [items, db])

  const handleSelectAddress = (addr: SavedAddress) => {
    setForm({
      name: profile?.name || "",
      email: user?.email || "",
      phone: addr.phone,
      address: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    })
    setSelectedAddressId(addr.id)
  }

  const shipping =
    subtotal > 0 && subtotal < 5000 ? 199 : 0

  const total = subtotal + shipping

  const onPay = async () => {
    if (!user) {
      toast.error("Please sign in to checkout.")
      return
    }

    if (!items.length) return

    const required = [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
    ] as const

    for (const k of required) {
      if (!form[k].trim()) {
        toast.error(`Please fill in your ${k}.`)
        return
      }
    }

    // CASH ON DELIVERY
    if (paymentMethod === "cod") {
      try {
        if (!db)
          throw new Error("Firestore not configured")

        // Create order document
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

          paymentMethod: "Cash on Delivery",

          status: "pending",

          createdAt: serverTimestamp(),
        })

        // Reduce stock for each product in order
        for (const item of items) {
          const productRef = doc(db, "products", item.id)
          await updateDoc(productRef, {
            stock: increment(-item.quantity),
          })
        }

        clearCart()

        toast.success(
          "Order placed successfully with Cash on Delivery!"
        )

        window.location.href = "/"

        return
      } catch (err) {
        console.log(err)

        toast.error("Failed to place order.")

        return
      }
    }

    // RAZORPAY (Prepaid)
    if (paymentMethod === "razorpay") {
      setPlacing(true)
    }

    try {
      const ok = await loadRazorpayScript()

      if (!ok)
        throw new Error("Could not load Razorpay")

      const res = await fetch("/api/razorpay/order", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          amount: total,
        }),
      })

      const data = await res.json()

      if (!res.ok)
        throw new Error(
          data.error || "Could not create order"
        )

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      if (!keyId)
        throw new Error("Razorpay key not configured.")

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

        theme: {
          color: "#3B1F0A",
        },

        handler: async (response: any) => {
          try {
            if (!db)
              throw new Error(
                "Firestore not configured"
              )

            // Create order document
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
                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_signature:
                  response.razorpay_signature,
              },

              status: "pending",

              createdAt: serverTimestamp(),
            })

            // Reduce stock for each product in order
            for (const item of items) {
              const productRef = doc(db, "products", item.id)
              await updateDoc(productRef, {
                stock: increment(-item.quantity),
              })
            }

            clearCart()

            toast.success(
              "Payment successful! Your order has been placed."
            )

            window.location.href = "/"
          } catch (err) {
            console.log(
              "[v0] save order error:",
              err
            )

            toast.error(
              "Payment received but saving order failed."
            )
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

        <h2 className="font-serif text-2xl text-primary">
          Your cart is empty
        </h2>

        <p className="max-w-md text-sm text-muted-foreground">
          Explore our handcrafted collection and find a
          piece you&apos;ll love for years.
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
    <div className="grid gap-6 sm:gap-8 lg:gap-10 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px]">
      {/* ITEMS */}
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          {items.map((item) => {
            const isOutOfStock = productStocks[item.id] === 0
            return (
            <div
              key={item.id}
              className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 rounded-lg border transition-colors ${
                isOutOfStock ? "border-red-200 bg-red-50" : "border-border bg-card"
              } p-3 sm:p-4`}
            >
              <div className="relative h-24 w-24 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={
                    item.image || "/placeholder.svg"
                  }
                  alt={item.name}
                  fill
                  sizes="96px"
                  className={`object-cover ${isOutOfStock ? "grayscale opacity-50" : ""}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.id}`}
                      className="font-serif text-base sm:text-lg text-foreground hover:text-accent line-clamp-2"
                    >
                      {item.name}
                    </Link>

                    <p className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                      {item.category}
                    </p>

                    <p className="mt-1 text-sm sm:text-base font-medium text-primary">
                      {formatINR(item.price)}
                    </p>
                  </div>
                  {isOutOfStock && (
                    <div className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 whitespace-nowrap">
                      <AlertCircle className="h-3.5 w-3.5 text-red-700" />
                      <span className="text-xs font-semibold text-red-700">Out of Stock</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.id,
                        item.quantity - 1
                      )
                    }
                    className="p-1.5 sm:p-2 hover:bg-secondary text-xs"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="min-w-6 sm:min-w-8 text-center text-xs sm:text-sm">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.id,
                        item.quantity + 1
                      )
                    }
                    className="p-1.5 sm:p-2 hover:bg-secondary text-xs"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 sm:p-2 text-muted-foreground hover:text-destructive ml-1"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            )
          })}
        </div>

        {/* SHIPPING */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
            <h2 className="font-serif text-lg sm:text-xl text-primary">
              Shipping address
            </h2>
            <Link href="/account" className="text-xs text-primary hover:underline whitespace-nowrap">
              Manage addresses
            </Link>
          </div>

          {/* SAVED ADDRESSES */}
          {savedAddresses.length > 0 && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                Saved addresses
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded mb-1">
                          {addr.label}
                        </span>
                        <p className="text-xs font-medium text-foreground">{addr.street}</p>
                        <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.pincode}</p>
                        <p className="text-xs text-muted-foreground mt-1">{addr.phone}</p>
                      </div>
                      {selectedAddressId === addr.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">
                Full name
              </Label>

              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>

              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pincode">
                Pincode
              </Label>

              <Input
                id="pincode"
                value={form.pincode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pincode: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="address">
                Address
              </Label>

              <Input
                id="address"
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>

              <Input
                id="city"
                value={form.city}
                onChange={(e) =>
                  setForm({
                    ...form,
                    city: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>

              <Input
                id="state"
                value={form.state}
                onChange={(e) =>
                  setForm({
                    ...form,
                    state: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-xl text-primary">
          Order summary
        </h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Subtotal
            </dt>

            <dd className="font-medium">
              {formatINR(subtotal)}
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Shipping
            </dt>

            <dd className="font-medium">
              {shipping === 0
                ? "Free"
                : formatINR(shipping)}
            </dd>
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-semibold text-primary">
              Total
            </dt>

            <dd className="font-semibold text-primary">
              {formatINR(total)}
            </dd>
          </div>
        </dl>

        {!user && (
          <p className="mt-4 text-xs text-muted-foreground">
            <Link
              href="/login"
              className="text-accent underline"
            >
              Sign in
            </Link>{" "}
            to place your order.
          </p>
        )}

        {/* PAYMENT METHOD */}
          <div className="mt-6 space-y-2 sm:space-y-3">
            <label className="flex items-center gap-2 rounded-md border border-border p-3 sm:p-4 cursor-pointer text-sm sm:text-base">
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() =>
                  setPaymentMethod("cod")
                }
              />

              <span>Cash on Delivery (COD)</span>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3 sm:p-4 cursor-pointer text-sm sm:text-base">
              <input
                type="radio"
                name="payment"
                value="razorpay"
                checked={paymentMethod === "razorpay"}
                onChange={() =>
                  setPaymentMethod("razorpay")
                }
              />

              <span>Prepaid (Razorpay)</span>
            </label>
          </div>

        <Button
          onClick={onPay}
          disabled={placing || !user}
          size="lg"
          className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {placing
            ? "Processing..."
            : paymentMethod === "cod"
            ? "Place Order (COD)"
            : `Pay ${formatINR(total)} (Razorpay)`}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secure checkout powered by UCall.
        </p>
      </aside>
    </div>
  )
}

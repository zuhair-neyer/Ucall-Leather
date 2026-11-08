"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Minus, Plus, Trash2, ShoppingBag, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import type { SavedAddress } from "@/lib/address"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { formatINR } from "@/lib/format"
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, MAX_ITEM_QUANTITY, STORE_NAME, shippingFor } from "@/lib/config"
import { calculateBilling } from "@/lib/billing"
import { addressSchema } from "@/lib/validation"
import type { PaymentMethod, PaymentStatus, ShippingAddress } from "@/lib/order-status"
import { apiRequest } from "@/lib/client-api"

interface RazorpayResponse { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
interface RazorpayOptions {
  key: string; amount: number; currency: string; order_id: string; name: string; description: string;
  prefill: { name: string; email: string; contact: string }; theme?: { color: string };
  handler: (response: RazorpayResponse) => void; modal: { ondismiss: () => void };
}
interface RazorpayInstance { open: () => void; on: (event: string, handler: () => void) => void }
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance } }
let razorpayScript: Promise<void> | undefined
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayScript) return razorpayScript
  razorpayScript = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { script.remove(); razorpayScript = undefined; reject(new Error("Payment window could not load. Check your connection and try again.")) }
    document.body.appendChild(script)
  })
  return razorpayScript
}
interface LiveProduct { stock: number; price: number; name: string; image: string; exists: boolean }
interface CheckoutResult {
  orderId: string; paymentMethod: PaymentMethod;
  razorpay?: { id: string; amount: number; currency: string; keyId: string };
}
const emptyAddress: ShippingAddress = { name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" }
const addressFields: { key: keyof ShippingAddress; label: string; autoComplete: string; type?: string; inputMode?: "numeric" | "tel"; maxLength: number }[] = [
  { key: "name", label: "Full name", autoComplete: "name", maxLength: 100 },
  { key: "email", label: "Email", type: "email", autoComplete: "email", maxLength: 254 },
  { key: "phone", label: "Indian mobile number (10 digits)", type: "tel", inputMode: "tel", autoComplete: "tel-national", maxLength: 10 },
  { key: "pincode", label: "Pincode", inputMode: "numeric", autoComplete: "postal-code", maxLength: 6 },
  { key: "address", label: "House number and street address", autoComplete: "street-address", maxLength: 500 },
  { key: "city", label: "City", autoComplete: "address-level2", maxLength: 100 },
  { key: "state", label: "State", autoComplete: "address-level1", maxLength: 100 },
]

export function CartView() {
  const { items, updateQuantity, removeItem, clearCart, hydrated } = useCart()
  const { user, profile, isConfigured } = useAuth()
  const router = useRouter()
  const [placing, setPlacing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod")
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [liveProducts, setLiveProducts] = useState<Record<string, LiveProduct>>({})
  const [stockError, setStockError] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null)
  const completed = useRef(false)
  const form = useForm<ShippingAddress>({ resolver: zodResolver(addressSchema), defaultValues: emptyAddress })
  const { register, reset, getValues, handleSubmit, formState: { errors } } = form
  const productIds = items.map(item => item.id).sort().join(",")

  useEffect(() => {
    if (!user || !isConfigured) return
    let active = true
    getDoc(doc(db, "users", user.uid)).then(snapshot => {
      if (!active) return
      const addresses: SavedAddress[] = snapshot.exists() && Array.isArray(snapshot.data().addresses) ? snapshot.data().addresses : []
      setSavedAddresses(addresses)
      const preferred = addresses.find(address => address.isDefault) || addresses[0]
      if (!getValues("address") && preferred) {
        reset({ name: profile?.name || user.displayName || "", email: user.email || "", phone: preferred.phone, address: preferred.street, city: preferred.city, state: preferred.state, pincode: preferred.pincode })
        setSelectedAddressId(preferred.id)
      } else {
        reset({ ...getValues(), name: getValues("name") || profile?.name || user.displayName || "", email: getValues("email") || user.email || "" })
      }
    }).catch(() => { if (active) toast.error("Saved addresses could not load. You can enter an address below.") })
    return () => { active = false }
  }, [user, profile?.name, isConfigured, getValues, reset])

  useEffect(() => {
    if (!isConfigured || !productIds) return
    setStockError(false)
    const unsubscribers = productIds.split(",").map(id => onSnapshot(doc(db, "products", id), snapshot => {
      const data = snapshot.data()
      setLiveProducts(previous => ({ ...previous, [id]: {
        exists: snapshot.exists(), stock: data && Number.isInteger(data.stock) && data.stock >= 0 ? data.stock : 0,
        price: typeof data?.price === "number" && data.price > 0 ? data.price : 0,
        name: typeof data?.name === "string" ? data.name : "Unavailable product",
        image: typeof data?.image === "string" ? data.image : "/placeholder.svg",
      } }))
    }, () => setStockError(true)))
    return () => unsubscribers.forEach(unsubscribe => unsubscribe())
  }, [productIds, isConfigured])

  useEffect(() => {
    for (const item of items) {
      const stock = liveProducts[item.id]?.stock
      if (stock && item.quantity > Math.min(stock, MAX_ITEM_QUANTITY)) updateQuantity(item.id, Math.min(stock, MAX_ITEM_QUANTITY))
    }
  }, [items, liveProducts, updateQuantity])

  const ready = isConfigured && !stockError && items.every(item => liveProducts[item.id] !== undefined)
  const unavailable = items.some(item => !liveProducts[item.id]?.exists || liveProducts[item.id].stock <= 0 || liveProducts[item.id].price <= 0)
  const subtotal = items.reduce((sum, item) => sum + Math.round((liveProducts[item.id]?.price ?? item.price) * 100) * item.quantity, 0) / 100
  const shipping = items.length ? shippingFor(subtotal) : 0
  const { total, gst } = calculateBilling(subtotal, shipping)

  function chooseAddress(address: SavedAddress) {
    reset({ ...getValues(), name: getValues("name") || profile?.name || "", email: getValues("email") || user?.email || "", phone: address.phone, address: address.street, city: address.city, state: address.state, pincode: address.pincode })
    setSelectedAddressId(address.id)
  }

  async function onPay(address: ShippingAddress) {
    if (!user) { toast.error("Please sign in to checkout."); return }
    if (!ready || unavailable || placing || !items.length) return
    setPlacing(true)
    completed.current = false
    let createdOrderId: string | undefined
    try {
    const body = { items: items.map(({ id, quantity }) => ({ id, quantity })), address, paymentMethod }
    const fingerprint = JSON.stringify({ uid: user.uid, ...body })
    // Persist only the opaque key and a SHA-256 digest, never the customer's address.
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint))), b => b.toString(16).padStart(2, "0")).join("")
    if (requestKey.current?.fingerprint !== digest) {
      let key: string = crypto.randomUUID()
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem("ucall.checkout") || "null")
        if (saved && typeof saved === "object" && "fingerprint" in saved && saved.fingerprint === digest && "key" in saved && typeof saved.key === "string") key = saved.key
        sessionStorage.setItem("ucall.checkout", JSON.stringify({ fingerprint: digest, key }))
      } catch { /* Checkout still works when browser storage is disabled. */ }
      requestKey.current = { fingerprint: digest, key }
    }
      if (paymentMethod === "razorpay") await loadRazorpayScript()
      const result = await apiRequest<CheckoutResult>(user, "/api/checkout", body, { idempotencyKey: requestKey.current.key })
      createdOrderId = result.orderId
      setLastOrderId(result.orderId)
      if (result.paymentMethod === "cod" || !result.razorpay) {
        clearCart()
        try { sessionStorage.removeItem("ucall.checkout") } catch { /* Optional storage. */ }
        router.push(`/orders/${result.orderId}`)
        return
      }
      if (!window.Razorpay) throw new Error("Payment window is unavailable. Your order has been saved; please try again.")
      const checkout = new window.Razorpay({
        key: result.razorpay.keyId, amount: result.razorpay.amount, currency: result.razorpay.currency,
        order_id: result.razorpay.id, name: STORE_NAME, description: `Order ${result.orderId}`,
        prefill: { name: address.name, email: address.email, contact: address.phone },
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() },
        handler: async response => {
          completed.current = true
          try {
            const verified = await apiRequest<{ orderId: string; paymentStatus: PaymentStatus }>(user, "/api/razorpay/verify", { orderId: result.orderId, ...response })
            if (verified.paymentStatus === "refund_needed") toast.error("Payment received, but stock sold out. The store will arrange your refund.")
            else if (verified.paymentStatus === "paid") toast.success("Payment verified. Thank you for your order.")
            else toast.info("Payment is being confirmed. Your order page will update automatically.")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment confirmation is still being checked. See your order for updates.")
          } finally {
            // The server already saved this order. The webhook also reconciles payment.
            clearCart()
            try { sessionStorage.removeItem("ucall.checkout") } catch { /* Optional storage. */ }
            setPlacing(false)
            router.push(`/orders/${result.orderId}`)
          }
        },
        modal: { ondismiss: () => {
          setPlacing(false)
          if (!completed.current) toast.info("Payment window closed. Your unpaid order is saved. Retry here or view the order below.")
        } },
      })
      checkout.on("payment.failed", () => { toast.error("Payment was not completed. Retry in the payment window or close it to review your order.") })
      checkout.open()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed.")
      if (createdOrderId) setLastOrderId(createdOrderId)
      setPlacing(false)
    }
  }

  if (!hydrated) return <p className="animate-pulse py-12 text-muted-foreground">Loading your cart…</p>
  if (!items.length) return <div className="journey-empty flex flex-col items-center gap-4 rounded-lg border border-border px-4 py-24 text-center">
    <ShoppingBag className="size-12 text-muted-foreground" aria-hidden="true" /><h2 className="font-serif text-2xl text-primary">Your cart is empty</h2>
    <p className="max-w-md text-sm text-muted-foreground">Explore our handcrafted collection and find a piece you&apos;ll love for years.</p>
    <Button asChild className="min-h-11"><Link href="/products">Shop the collection</Link></Button>
  </div>

  return <form onSubmit={event => { void handleSubmit(onPay)(event) }} noValidate className="journey-cart-grid grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
    <fieldset disabled={placing} className="min-w-0 space-y-6">
      <legend className="sr-only">Cart and delivery information</legend>
      <div className="space-y-4">{items.map(item => {
        const product = liveProducts[item.id]
        const out = Boolean(product && (!product.exists || product.stock <= 0))
        const maximum = Math.min(product?.stock ?? 0, MAX_ITEM_QUANTITY)
        return <div key={item.id} className={`journey-cart-item flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 ${out ? "border-destructive" : "border-border"}`}>
          <div className="journey-cart-image relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={product?.image || item.image || "/placeholder.svg"} alt={product?.name || item.name} fill sizes="(max-width: 600px) 74px, 98px" className="object-cover" /></div>
          <div className="min-w-0 flex-1"><Link href={`/products/${item.id}`} className="journey-cart-item-title font-serif text-lg text-primary hover:text-accent">{product?.name || item.name}</Link><p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{item.category}</p><p className="mt-2 text-sm font-medium">{formatINR(product?.price ?? item.price)}</p>
            {out && <p className="mt-1 flex items-center gap-1 text-sm text-destructive"><AlertCircle className="size-4" aria-hidden="true" />Unavailable — please remove this item</p>}
            {!product && <p className="text-xs text-muted-foreground">Checking availability…</p>}
          </div>
          <div className="flex items-center gap-2"><div className="journey-quantity flex items-center rounded-md border border-border">
            <button type="button" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`} className="flex min-h-11 min-w-11 items-center justify-center hover:bg-secondary disabled:opacity-40"><Minus className="size-4" /></button>
            <span className="min-w-6 text-center text-sm" aria-live="polite">{item.quantity}</span>
            <button type="button" disabled={!ready || item.quantity >= maximum} onClick={() => updateQuantity(item.id, Math.min(maximum, item.quantity + 1))} aria-label={`Increase quantity of ${item.name}`} className="flex min-h-11 min-w-11 items-center justify-center hover:bg-secondary disabled:opacity-40"><Plus className="size-4" /></button>
          </div><button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`} className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></div>
        </div>
      })}</div>
      <section className="journey-panel journey-cart-address rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="journey-panel-heading flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-primary">Shipping address</h2><Link href="/account" className="inline-flex min-h-11 items-center text-xs text-accent hover:underline">Manage addresses</Link></div>
        {savedAddresses.length > 0 && <div className="mb-5 grid gap-2 sm:grid-cols-2">{savedAddresses.map(address => <button type="button" key={address.id} onClick={() => chooseAddress(address)} aria-pressed={selectedAddressId === address.id} className={`rounded-lg border p-3 text-left ${selectedAddressId === address.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}><span className="flex items-center justify-between text-sm font-medium">{address.label}{selectedAddressId === address.id && <Check className="size-4" />}</span><span className="mt-1 block text-xs text-muted-foreground">{address.street}, {address.city}, {address.state} {address.pincode}</span></button>)}</div>}
        <div className="grid gap-4 sm:grid-cols-2">{addressFields.map(field => <div key={field.key} className={field.key === "address" ? "sm:col-span-2" : ""}>
          <Label htmlFor={`shipping-${field.key}`}>{field.label}</Label><Input id={`shipping-${field.key}`} {...register(field.key)} type={field.type || "text"} inputMode={field.inputMode} autoComplete={field.autoComplete} maxLength={field.maxLength} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} className="mt-1 min-h-11" />
          {errors[field.key] && <p id={`error-${field.key}`} className="mt-1 text-sm text-destructive">{errors[field.key]?.message}</p>}
        </div>)}</div>
      </section>
    </fieldset>
    <aside className="journey-panel journey-bill space-y-4 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="font-serif text-2xl text-primary">Order summary</h2>
      <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>Merchandise subtotal</dt><dd>{formatINR(subtotal)}</dd></div><div className="flex justify-between gap-3"><dt>GST (18%)</dt><dd>{formatINR(gst.amount)}</dd></div><div className="flex justify-between gap-3"><dt>Shipping</dt><dd>{shipping ? formatINR(shipping) : "Free"}</dd></div><div className="flex justify-between gap-3 border-t border-border pt-3 text-lg font-semibold"><dt>Total</dt><dd>{formatINR(total)}</dd></div></dl>
      <p className="text-xs text-muted-foreground">Product prices exclude GST. The total above includes 18% GST on the merchandise subtotal.</p>
      <p className="text-sm text-muted-foreground">{subtotal < FREE_SHIPPING_THRESHOLD ? `Add ${formatINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.` : "Your order qualifies for free shipping."} Shipping is {formatINR(SHIPPING_FEE)} below {formatINR(FREE_SHIPPING_THRESHOLD)}.</p>
      <fieldset disabled={placing} className="journey-payment-options space-y-2 border-t border-border pt-4"><legend className="sr-only">Payment method</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="radio" name="paymentMethod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="size-4 accent-primary" /><span>Cash on Delivery</span></label>
        {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && <label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="radio" name="paymentMethod" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} className="size-4 accent-primary" /><span>Pay online with Razorpay</span></label>}
      </fieldset>
      {!user ? <Button asChild className="min-h-11 w-full"><Link href="/login?next=/cart">Sign in to checkout</Link></Button> : <Button type="submit" disabled={placing || !ready || unavailable} className="min-h-11 w-full">{placing ? "Processing…" : paymentMethod === "cod" ? "Place COD order" : "Pay securely"}</Button>}
      {(!isConfigured || stockError) && <p role="alert" className="text-sm text-destructive">We cannot check stock right now. Please refresh and try again.</p>}
      {ready && unavailable && <p role="alert" className="text-sm text-destructive">Remove unavailable items before checkout.</p>}
      {lastOrderId && <p role="status" className="rounded-md bg-secondary p-3 text-sm">Your order has been saved. <Link href={`/orders/${lastOrderId}`} className="font-medium underline">View its payment status</Link> before placing another order.</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">By placing your order, you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy-policy" className="underline">privacy policy</Link>. Availability and totals are checked securely at checkout.</p>
    </aside>
  </form>
}

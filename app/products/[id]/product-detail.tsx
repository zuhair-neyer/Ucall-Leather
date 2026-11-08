"use client"

import { ProductImage } from "@/components/site/product-image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowUpRight, ShoppingBag, Minus, Plus, Share2, Truck, Package, ZoomIn } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useCart } from "@/context/cart-context"
import { formatINR } from "@/lib/format"
import { DISPATCH_BUSINESS_DAYS, FREE_SHIPPING_THRESHOLD, MAX_ITEM_QUANTITY, SHIPPING_FEE } from "@/lib/config"
import type { Product } from "@/lib/products"
import { ReviewsSection } from "./reviews-section"
import { doc, onSnapshot } from "firebase/firestore"
import { db, firebaseConfigured } from "@/lib/firebase"

export function ProductDetail({ product: initialProduct }: { product: Product }) {
  const { addItem, items } = useCart()
  const [product, setProduct] = useState(initialProduct)
  const [qty, setQty] = useState(1)
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [stockError, setStockError] = useState(false)
  const images = product.images?.length ? product.images : [product.image]
  const image = images[active] || images[0] || "/placeholder.svg"
  const stock = product.stock ?? 0
  const isOutOfStock = stock <= 0
  const cartQuantity = items.find(item => item.id === product.id)?.quantity ?? 0
  const availableStock = Math.max(0, Math.min(stock, MAX_ITEM_QUANTITY) - cartQuantity)
  const selectedQuantity = Math.min(qty, Math.max(1, availableStock))

  useEffect(() => {
    if (!firebaseConfigured) return
    return onSnapshot(doc(db, "products", initialProduct.id), snapshot => {
      if (snapshot.exists()) setProduct({ ...initialProduct, ...snapshot.data(), id: snapshot.id } as Product)
      else setProduct(previous => ({ ...previous, stock: 0 }))
      setStockError(false)
    }, () => setStockError(true))
  }, [initialProduct])

  function handleAdd() {
    if (isOutOfStock || availableStock < selectedQuantity) { toast.error("There is no more stock available to add."); return }
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category }, selectedQuantity)
    toast.success(`${product.name} added to cart`)
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: window.location.href })
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Product link copied") }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share the link. Copy the page address from your browser.")
    }
  }

  return (
    <div className="piece-shell">
      <nav aria-label="Breadcrumb" className="piece-breadcrumb"><ol><li><Link href="/">Home</Link></li><li aria-hidden="true">/</li><li><Link href={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link></li><li aria-hidden="true">/</li><li aria-current="page">{product.name}</li></ol></nav>
      <div className="piece-layout">
        <div className="piece-gallery">
          <div className="piece-gallery-label"><span>THE UCALL EDIT</span><span aria-live="polite">{Math.min(active + 1, images.length).toString().padStart(2, "0")} / {images.length.toString().padStart(2, "0")}</span></div>
          <button type="button" onClick={() => setZoom(true)} className="piece-image-stage" aria-label={`Enlarge image of ${product.name}`}>
            <span className="piece-stage-edge" aria-hidden="true" />
            <span className="piece-stage-photo"><ProductImage src={image} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain" priority /></span>
            <span className="piece-enlarge"><ZoomIn aria-hidden="true" />Enlarge</span>
            <span className="piece-stage-mark" aria-hidden="true">UC</span>
          </button>
          {images.length > 1 && <div className="piece-thumbnails">{images.map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`Show image ${index + 1} of ${product.name}`} aria-pressed={active === index} onClick={() => setActive(index)}><ProductImage src={src || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" /></button>)}</div>}
          <div className="piece-gallery-caption"><span>A closer look at the details.</span><span aria-hidden="true">LEATHER / CHARACTER / CRAFT</span></div>
        </div>
        <div className="piece-information">
          <p className="catalog-eyebrow"><span aria-hidden="true" />{product.category} / UCALL LEATHER CO.</p>
          <h1>{product.name}</h1>
          <div className="piece-price-row"><p>{formatINR(product.price)}</p><span className={`piece-availability${isOutOfStock ? " piece-availability-empty" : ""}`}><span aria-hidden="true" />{isOutOfStock ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock"}</span></div>
          <p className="piece-tax-note">18% GST is added at checkout. Shipping is calculated separately.</p>
          <p className="piece-description">{product.description}</p>
          <div className="piece-purchase">
            <p className="piece-purchase-label">MAKE IT PART OF YOUR EVERYDAY</p>
            <div className="piece-purchase-controls">
            <div className="piece-quantity">
              <button type="button" onClick={() => setQty(Math.max(1, selectedQuantity - 1))} aria-label="Decrease quantity" disabled={selectedQuantity <= 1 || isOutOfStock}><Minus aria-hidden="true" /></button>
              <span aria-live="polite">{selectedQuantity}</span>
              <button type="button" onClick={() => setQty(selectedQuantity + 1)} aria-label="Increase quantity" disabled={selectedQuantity >= availableStock || isOutOfStock}><Plus aria-hidden="true" /></button>
            </div>
            <Button size="lg" onClick={handleAdd} disabled={isOutOfStock || availableStock === 0} className="piece-add"><ShoppingBag aria-hidden="true" /><span>{isOutOfStock ? "Out of stock" : availableStock === 0 ? "Maximum quantity in cart" : "Add to cart"}</span><ArrowUpRight aria-hidden="true" /></Button>
            </div>
            <p className="piece-cart-note">Maximum {MAX_ITEM_QUANTITY} per product per order.{cartQuantity > 0 ? ` ${cartQuantity} already in your cart.` : ""}</p>
          </div>
          {stockError && <p role="status" className="piece-stock-error">Live availability could not be refreshed. Stock will be checked again at checkout.</p>}
          <ul className="piece-delivery-facts"><li><Truck aria-hidden="true" /><div><strong>From us to you</strong><span>Ships in {DISPATCH_BUSINESS_DAYS} business days across India.</span></div></li><li><Package aria-hidden="true" /><div><strong>Thoughtfully delivered</strong><span>Free shipping from {formatINR(FREE_SHIPPING_THRESHOLD)}; {formatINR(SHIPPING_FEE)} below that.</span></div></li></ul>
          <div className="piece-footer-actions"><Link href="/refund-policy">Read our returns policy<ArrowUpRight aria-hidden="true" /></Link><Button variant="ghost" onClick={() => void share()}><Share2 aria-hidden="true" />Share this piece</Button></div>
        </div>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="piece-zoom-dialog sm:max-w-3xl"><DialogTitle className="pr-6 font-serif text-2xl">{product.name}</DialogTitle><DialogDescription>Image {Math.min(active + 1, images.length)} of {images.length}</DialogDescription><div className="relative aspect-square max-h-[70dvh] w-full"><ProductImage src={image} alt={`Enlarged view of ${product.name}`} fill sizes="(max-width: 768px) 95vw, 720px" className="object-contain" /></div></DialogContent></Dialog>
      <ReviewsSection productId={product.id} />
    </div>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ShoppingBag, Minus, Plus, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { formatINR } from "@/lib/format"
import type { Product } from "@/lib/products"
import { ReviewsSection } from "./reviews-section"

export function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const images = product.images?.length ? product.images : [product.image]
  const [active, setActive] = useState(0)
  const isOutOfStock = product.stock === 0

  const handleAdd = () => {
    if (isOutOfStock) {
      toast.error("This product is out of stock")
      return
    }
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
      },
      qty,
    )
    toast.success(`${product.name} added to cart`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={images[active] || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActive(idx)}
                  className={`relative aspect-square w-20 overflow-hidden rounded-md border ${
                    active === idx ? "border-primary" : "border-border"
                  }`}
                >
                  <Image src={src || "/placeholder.svg"} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-accent">{product.category}</span>
          <h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-2xl font-semibold text-primary">{formatINR(product.price)}</p>
            {isOutOfStock && (
              <span className="rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                Out of Stock
              </span>
            )}
          </div>
          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

          <Separator className="my-8" />

          <div className={`flex flex-col gap-4 sm:flex-row sm:items-center ${isOutOfStock ? "opacity-50" : ""}`}>
            <div className="inline-flex items-center rounded-md border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-secondary disabled:opacity-50"
                aria-label="Decrease quantity"
                disabled={isOutOfStock}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="p-3 hover:bg-secondary disabled:opacity-50"
                aria-label="Increase quantity"
                disabled={isOutOfStock}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`flex-1 ${
                isOutOfStock
                  ? "cursor-not-allowed bg-gray-400 text-gray-600 hover:bg-gray-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {isOutOfStock ? "Out of Stock" : "Add to cart"}
            </Button>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
            <li>- Full-grain leather, hand finished.</li>
            <li>- Saddle-stitched for lifetime strength.</li>
            <li>- Ships in 2-4 business days across India.</li>
          </ul>
        </div>
      </div>

      <ReviewsSection productId={product.id} />
    </div>
  )
}

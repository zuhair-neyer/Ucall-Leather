"use client"

import { Suspense } from "react"
import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ProductCard } from "@/components/site/product-card"
import type { Product } from "@/lib/products"
import { formatINR } from "@/lib/format"

const CATEGORIES = ["All", "Bags", "Belts", "Wallets", "Jackets"] as const

function ProductsViewInner({ products }: { products: Product[] }) {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") ?? "All"

  const priceBounds = useMemo(() => {
    if (!products.length) return [0, 20000] as [number, number]
    const prices = products.map((p) => p.price)
    return [Math.min(...prices), Math.max(...prices)] as [number, number]
  }, [products])

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>(initialCategory)
  const [priceRange, setPriceRange] = useState<[number, number]>(priceBounds)

  useEffect(() => {
    setPriceRange(priceBounds)
  }, [priceBounds])

  useEffect(() => {
    const q = searchParams.get("category")
    if (q) setCategory(q)
  }, [searchParams])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === "All" || p.category === category
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1]
      return matchesQuery && matchesCategory && matchesPrice
    })
  }, [products, query, category, priceRange])

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-[200px_1fr] xl:grid-cols-[240px_1fr]">
      {/* Filters */}
      <aside className="space-y-6 sm:space-y-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:flex-col lg:items-stretch">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                variant={category === c ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(c)}
                className={`text-xs sm:text-sm ${
                  category === c
                    ? "justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                    : "justify-start border-border text-foreground"
                }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price
          </label>
          <Slider
            min={priceBounds[0]}
            max={priceBounds[1]}
            step={100}
            value={priceRange}
            onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatINR(priceRange[0])}</span>
            <span>{formatINR(priceRange[1])}</span>
          </div>
        </div>
      </aside>

      {/* Grid */}
      <div>
        {filtered.length === 0 ? (
          <div className="flex h-56 sm:h-72 items-center justify-center rounded-lg border border-dashed border-border text-xs sm:text-sm text-muted-foreground">
            No products match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ProductsView({ products }: { products: Product[] }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsViewInner products={products} />
    </Suspense>
  )
}
